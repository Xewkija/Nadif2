-- ============================================================================
-- Utility RPCs and Scheduled Job Functions
-- Phase 1A: Database Foundation
-- ============================================================================

-- ============================================================================
-- Expire Quotes (scheduled job)
-- Per Spec B.1: quote_pending -> quote_expired when expires_at < now()
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_quotes()
RETURNS JSONB AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE bookings
  SET
    status = 'quote_expired',
    updated_at = NOW()
  WHERE status = 'quote_pending'
  AND quote_expires_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This function should be called by a scheduled job (pg_cron or external)

-- ============================================================================
-- Accept Quote by Customer (public access via token)
-- Per Spec B.1: quote_pending -> quote_accepted
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_quote_by_customer(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_token_valid BOOLEAN;
BEGIN
  -- In production, this would validate a secure quote token
  -- For now, using booking ID directly (to be replaced with token system)

  -- TODO: Implement secure token lookup
  -- SELECT booking_id INTO v_booking_id FROM quote_tokens WHERE token = p_token AND expires_at > NOW();

  RETURN jsonb_build_object('success', false, 'error', 'Quote token system not yet implemented');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous access for customer quote acceptance
GRANT EXECUTE ON FUNCTION accept_quote_by_customer(TEXT) TO anon;

-- ============================================================================
-- Create Customer
-- ============================================================================

CREATE OR REPLACE FUNCTION create_customer(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_customer_type customer_type DEFAULT 'lead',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_customer_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Validate at least email or phone
  IF p_email IS NULL AND p_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email or phone required');
  END IF;

  INSERT INTO customers (
    tenant_id,
    first_name,
    last_name,
    email,
    phone,
    customer_type,
    notes
  ) VALUES (
    v_tenant_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    p_customer_type,
    p_notes
  )
  RETURNING id INTO v_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_customer(TEXT, TEXT, TEXT, TEXT, customer_type, TEXT) TO authenticated;

-- ============================================================================
-- Create Property
-- ============================================================================

CREATE OR REPLACE FUNCTION create_property(
  p_customer_id UUID,
  p_address_line1 TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_address_line2 TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'US',
  p_property_type property_type DEFAULT 'house',
  p_square_feet INTEGER DEFAULT NULL,
  p_bedrooms INTEGER DEFAULT NULL,
  p_bathrooms NUMERIC DEFAULT NULL,
  p_access_notes TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_google_place_id TEXT DEFAULT NULL,
  p_geocode_confidence geocode_confidence DEFAULT NULL,
  p_is_primary BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_property_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Validate customer belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM customers
    WHERE id = p_customer_id AND tenant_id = v_tenant_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- If setting as primary, unset other primaries
  IF p_is_primary THEN
    UPDATE properties
    SET is_primary = FALSE
    WHERE customer_id = p_customer_id AND is_primary = TRUE;
  END IF;

  INSERT INTO properties (
    tenant_id,
    customer_id,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    property_type,
    square_feet,
    bedrooms,
    bathrooms,
    access_notes,
    latitude,
    longitude,
    google_place_id,
    geocode_confidence,
    geocoded_at,
    is_primary
  ) VALUES (
    v_tenant_id,
    p_customer_id,
    p_address_line1,
    p_address_line2,
    p_city,
    p_state,
    p_postal_code,
    p_country,
    p_property_type,
    p_square_feet,
    p_bedrooms,
    p_bathrooms,
    p_access_notes,
    p_latitude,
    p_longitude,
    p_google_place_id,
    p_geocode_confidence,
    CASE WHEN p_latitude IS NOT NULL THEN NOW() ELSE NULL END,
    p_is_primary
  )
  RETURNING id INTO v_property_id;

  RETURN jsonb_build_object(
    'success', true,
    'property_id', v_property_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_property(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, property_type, INTEGER, INTEGER, NUMERIC, TEXT, NUMERIC, NUMERIC, TEXT, geocode_confidence, BOOLEAN) TO authenticated;

-- ============================================================================
-- Create Service
-- ============================================================================

CREATE OR REPLACE FUNCTION create_service(
  p_name TEXT,
  p_service_type service_type_code,
  p_base_price_cents INTEGER,
  p_description TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_estimated_duration_minutes INTEGER DEFAULT 120,
  p_requires_quote BOOLEAN DEFAULT FALSE,
  p_is_recurring_eligible BOOLEAN DEFAULT TRUE,
  p_allowed_frequencies booking_frequency_code[] DEFAULT ARRAY['onetime', 'weekly', 'biweekly', 'monthly']::booking_frequency_code[],
  p_first_occurrence_override_service_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_service_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  INSERT INTO services (
    tenant_id,
    name,
    description,
    service_type,
    base_price_cents,
    category_id,
    estimated_duration_minutes,
    requires_quote,
    is_recurring_eligible,
    allowed_frequencies,
    first_occurrence_override_service_id
  ) VALUES (
    v_tenant_id,
    p_name,
    p_description,
    p_service_type,
    p_base_price_cents,
    p_category_id,
    p_estimated_duration_minutes,
    p_requires_quote,
    p_is_recurring_eligible,
    p_allowed_frequencies,
    p_first_occurrence_override_service_id
  )
  RETURNING id INTO v_service_id;

  RETURN jsonb_build_object(
    'success', true,
    'service_id', v_service_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_service(TEXT, service_type_code, INTEGER, TEXT, UUID, INTEGER, BOOLEAN, BOOLEAN, booking_frequency_code[], UUID) TO authenticated;

-- ============================================================================
-- Create Add-on
-- ============================================================================

CREATE OR REPLACE FUNCTION create_add_on(
  p_name TEXT,
  p_price_cents INTEGER,
  p_description TEXT DEFAULT NULL,
  p_price_type TEXT DEFAULT 'flat',
  p_scope_mode addon_scope_mode DEFAULT 'all_services',
  p_scoped_service_ids UUID[] DEFAULT NULL,
  p_scoped_service_types service_type_code[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_add_on_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  INSERT INTO add_ons (
    tenant_id,
    name,
    description,
    price_cents,
    price_type,
    scope_mode,
    scoped_service_ids,
    scoped_service_types
  ) VALUES (
    v_tenant_id,
    p_name,
    p_description,
    p_price_cents,
    p_price_type,
    p_scope_mode,
    p_scoped_service_ids,
    p_scoped_service_types
  )
  RETURNING id INTO v_add_on_id;

  RETURN jsonb_build_object(
    'success', true,
    'add_on_id', v_add_on_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_add_on(TEXT, INTEGER, TEXT, TEXT, addon_scope_mode, UUID[], service_type_code[]) TO authenticated;

-- ============================================================================
-- Get Booking with Related Data
-- ============================================================================

CREATE OR REPLACE FUNCTION get_booking_detail(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT jsonb_build_object(
    'booking', to_jsonb(b),
    'customer', to_jsonb(c),
    'property', to_jsonb(p),
    'service', to_jsonb(s),
    'provider', to_jsonb(pr),
    'add_ons', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'add_on', to_jsonb(a),
        'quantity', ba.quantity,
        'price_cents', ba.price_cents
      )), '[]')
      FROM booking_add_ons ba
      JOIN add_ons a ON a.id = ba.add_on_id
      WHERE ba.booking_id = b.id
    ),
    'series', to_jsonb(rs)
  ) INTO v_result
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  JOIN properties p ON p.id = b.property_id
  JOIN services s ON s.id = b.service_id
  LEFT JOIN profiles pr ON pr.id = b.assigned_provider_id
  LEFT JOIN recurring_series rs ON rs.id = b.recurring_series_id
  WHERE b.id = p_booking_id AND b.tenant_id = v_tenant_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_booking_detail(UUID) TO authenticated;

-- ============================================================================
-- Add Booking Add-ons
-- ============================================================================

CREATE OR REPLACE FUNCTION add_booking_add_ons(
  p_booking_id UUID,
  p_add_ons JSONB  -- Array of {add_on_id, quantity}
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_add_on JSONB;
  v_add_on_record RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status NOT IN ('draft', 'quote_pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify add-ons after booking is confirmed');
  END IF;

  -- Clear existing add-ons
  DELETE FROM booking_add_ons WHERE booking_id = p_booking_id;

  -- Add new add-ons
  FOR v_add_on IN SELECT * FROM jsonb_array_elements(p_add_ons)
  LOOP
    SELECT * INTO v_add_on_record
    FROM add_ons
    WHERE id = (v_add_on->>'add_on_id')::UUID
    AND tenant_id = v_tenant_id
    AND is_active = TRUE;

    IF v_add_on_record IS NOT NULL THEN
      INSERT INTO booking_add_ons (booking_id, add_on_id, quantity, price_cents)
      VALUES (
        p_booking_id,
        v_add_on_record.id,
        COALESCE((v_add_on->>'quantity')::INTEGER, 1),
        v_add_on_record.price_cents
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_booking_add_ons(UUID, JSONB) TO authenticated;

-- ============================================================================
-- Initialize Tenant Settings
-- Auto-create settings row when tenant is created
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_tenant_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_create_tenant_settings
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION initialize_tenant_settings();

-- ============================================================================
-- Create Review Request
-- Per Spec F.3: Post-service review trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION create_review_request(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_token TEXT;
  v_token_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only request review for completed bookings');
  END IF;

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Get location from property
  INSERT INTO review_tokens (
    tenant_id,
    booking_id,
    customer_id,
    location_id,
    token,
    token_hash,
    expires_at
  )
  SELECT
    v_booking.tenant_id,
    v_booking.id,
    v_booking.customer_id,
    p.assigned_location_id,
    v_token,
    encode(sha256(v_token::bytea), 'hex'),
    NOW() + INTERVAL '7 days'
  FROM properties p
  WHERE p.id = v_booking.property_id
  RETURNING id INTO v_token_id;

  RETURN jsonb_build_object(
    'success', true,
    'token_id', v_token_id,
    'token', v_token,
    'expires_at', NOW() + INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_review_request(UUID) TO authenticated;

-- ============================================================================
-- Dashboard Counters
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_counters()
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT jsonb_build_object(
    'today_scheduled', (
      SELECT COUNT(*) FROM bookings
      WHERE tenant_id = v_tenant_id
      AND scheduled_date = CURRENT_DATE
      AND status IN ('scheduled', 'in_progress')
    ),
    'needs_assignment', (
      SELECT COUNT(*) FROM bookings
      WHERE tenant_id = v_tenant_id
      AND status = 'confirmed'
      AND assigned_provider_id IS NULL
      AND scheduled_date >= CURRENT_DATE
    ),
    'pending_quotes', (
      SELECT COUNT(*) FROM bookings
      WHERE tenant_id = v_tenant_id
      AND status = 'quote_pending'
    ),
    'completed_this_week', (
      SELECT COUNT(*) FROM bookings
      WHERE tenant_id = v_tenant_id
      AND status = 'completed'
      AND check_out_at >= date_trunc('week', CURRENT_DATE)
    ),
    'active_series', (
      SELECT COUNT(*) FROM recurring_series
      WHERE tenant_id = v_tenant_id
      AND status = 'active'
    ),
    'total_customers', (
      SELECT COUNT(*) FROM customers
      WHERE tenant_id = v_tenant_id
      AND is_active = TRUE
    )
  ) INTO v_result;

  RETURN jsonb_build_object('success', true, 'counters', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_dashboard_counters() TO authenticated;
