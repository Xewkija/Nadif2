-- ============================================================================
-- Quote Token System
-- Enables secure, token-based quote acceptance by customers
-- ============================================================================

-- Generate secure token using UUID as base (64 char hex string)
CREATE OR REPLACE FUNCTION generate_quote_token()
RETURNS TEXT AS $$
BEGIN
  -- Combine two UUIDs for a 64-character hex token
  RETURN REPLACE(gen_random_uuid()::text, '-', '') || REPLACE(gen_random_uuid()::text, '-', '');
END;
$$ LANGUAGE plpgsql;

-- Quote tokens table
CREATE TABLE IF NOT EXISTS quote_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT generate_quote_token(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quote_tokens_token ON quote_tokens(token);
CREATE INDEX idx_quote_tokens_booking ON quote_tokens(booking_id);
CREATE INDEX idx_quote_tokens_expires ON quote_tokens(expires_at);

-- RLS
ALTER TABLE quote_tokens ENABLE ROW LEVEL SECURITY;

-- Staff can read tokens for their workspace
CREATE POLICY "quote_tokens_workspace_read" ON quote_tokens
FOR SELECT USING (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Update send_quote to generate a token
-- ============================================================================

CREATE OR REPLACE FUNCTION send_quote(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Get and validate booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only send quote from draft status');
  END IF;

  -- Calculate expiration (7 days from now)
  v_expires_at := NOW() + INTERVAL '7 days';

  -- Generate quote token
  INSERT INTO quote_tokens (tenant_id, booking_id, expires_at)
  VALUES (v_tenant_id, p_booking_id, v_expires_at)
  RETURNING token INTO v_token;

  -- Update booking status
  UPDATE bookings
  SET
    status = 'quote_pending',
    quote_sent_at = NOW(),
    quote_expires_at = v_expires_at,
    quote_version = COALESCE(quote_version, 0) + 1,
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Get Quote by Token (public, no auth required)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_quote_by_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_quote_token RECORD;
  v_booking RECORD;
  v_customer RECORD;
  v_property RECORD;
  v_service RECORD;
  v_tenant RECORD;
  v_add_ons JSONB;
BEGIN
  -- Find the quote token
  SELECT * INTO v_quote_token
  FROM quote_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
  END IF;

  -- Check if already used
  IF v_quote_token.used_at IS NOT NULL THEN
    -- Still return the quote info, just mark it as used
  END IF;

  -- Get booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_quote_token.booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Get related data
  SELECT * INTO v_customer FROM customers WHERE id = v_booking.customer_id;
  SELECT * INTO v_property FROM properties WHERE id = v_booking.property_id;
  SELECT * INTO v_service FROM services WHERE id = v_booking.service_id;
  SELECT * INTO v_tenant FROM tenants WHERE id = v_booking.tenant_id;

  -- Get add-ons
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', a.name,
    'price_cents', ba.price_cents
  )), '[]'::jsonb) INTO v_add_ons
  FROM booking_add_ons ba
  JOIN add_ons a ON a.id = ba.add_on_id
  WHERE ba.booking_id = v_booking.id;

  RETURN jsonb_build_object(
    'success', true,
    'quote', jsonb_build_object(
      'id', v_booking.id,
      'status', v_booking.status,
      'service_name', v_service.name,
      'service_description', v_service.description,
      'scheduled_date', v_booking.scheduled_date,
      'scheduled_time_start', v_booking.scheduled_time_start,
      'scheduled_time_window', v_booking.scheduled_time_window,
      'total_price_cents', v_booking.total_price_cents,
      'address_line1', v_property.address_line1,
      'city', v_property.city,
      'state', v_property.state,
      'postal_code', v_property.postal_code,
      'customer_first_name', v_customer.first_name,
      'quote_expires_at', v_quote_token.expires_at,
      'tenant_name', v_tenant.name,
      'add_ons', v_add_ons
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous access
GRANT EXECUTE ON FUNCTION get_quote_by_token(TEXT) TO anon;

-- ============================================================================
-- Accept Quote by Customer (public, token-based auth)
-- ============================================================================

DROP FUNCTION IF EXISTS accept_quote_by_customer(TEXT);

CREATE OR REPLACE FUNCTION accept_quote_by_customer(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_quote_token RECORD;
  v_booking RECORD;
BEGIN
  -- Find and validate token
  SELECT * INTO v_quote_token
  FROM quote_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quote token');
  END IF;

  -- Check if expired
  IF v_quote_token.expires_at < NOW() THEN
    -- Mark booking as expired if still pending
    UPDATE bookings
    SET status = 'quote_expired', updated_at = NOW()
    WHERE id = v_quote_token.booking_id AND status = 'quote_pending';

    RETURN jsonb_build_object('success', false, 'error', 'Quote has expired');
  END IF;

  -- Check if already used
  IF v_quote_token.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote has already been processed');
  END IF;

  -- Get booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_quote_token.booking_id;

  IF v_booking.status != 'quote_pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote is no longer pending');
  END IF;

  -- Accept the quote
  UPDATE bookings
  SET
    status = 'quote_accepted',
    quote_accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_quote_token.booking_id;

  -- Mark token as used
  UPDATE quote_tokens
  SET used_at = NOW()
  WHERE id = v_quote_token.id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_quote_token.booking_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous access
GRANT EXECUTE ON FUNCTION accept_quote_by_customer(TEXT) TO anon;

-- ============================================================================
-- Decline Quote by Customer (public, token-based auth)
-- ============================================================================

CREATE OR REPLACE FUNCTION decline_quote_by_customer(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_quote_token RECORD;
  v_booking RECORD;
BEGIN
  -- Find and validate token
  SELECT * INTO v_quote_token
  FROM quote_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quote token');
  END IF;

  -- Check if already used
  IF v_quote_token.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote has already been processed');
  END IF;

  -- Get booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_quote_token.booking_id;

  IF v_booking.status != 'quote_pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote is no longer pending');
  END IF;

  -- Decline the quote
  UPDATE bookings
  SET
    status = 'quote_declined',
    updated_at = NOW()
  WHERE id = v_quote_token.booking_id;

  -- Mark token as used
  UPDATE quote_tokens
  SET used_at = NOW()
  WHERE id = v_quote_token.id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_quote_token.booking_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous access
GRANT EXECUTE ON FUNCTION decline_quote_by_customer(TEXT) TO anon;
