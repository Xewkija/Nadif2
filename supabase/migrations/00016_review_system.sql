-- ============================================================================
-- Review System Migration
-- Phase 1H: Review/Recovery System (Capture Only)
-- ============================================================================

-- ============================================================================
-- RLS Policies for Review Tables
-- ============================================================================

ALTER TABLE review_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_feedback ENABLE ROW LEVEL SECURITY;

-- Review configs are tenant-scoped for staff
CREATE POLICY "tenant_isolation" ON review_configs
  FOR ALL USING (tenant_id = get_active_tenant_id());

-- Review tokens: staff can see all, public access via token
CREATE POLICY "tenant_isolation" ON review_tokens
  FOR ALL USING (tenant_id = get_active_tenant_id());

-- Internal feedback is tenant-scoped
CREATE POLICY "tenant_isolation" ON internal_feedback
  FOR ALL USING (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Generate Review Token
-- Creates a secure token for customer review access
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_review_token()
RETURNS TEXT AS $$
BEGIN
  -- Generate a URL-safe token using two UUIDs
  RETURN encode(
    decode(
      replace(replace(gen_random_uuid()::text, '-', ''), '-', '') ||
      replace(replace(gen_random_uuid()::text, '-', ''), '-', ''),
      'hex'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create Review Request
-- Called after booking completion to generate review token
-- ============================================================================

CREATE OR REPLACE FUNCTION create_review_request(
  p_booking_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_location_id UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_token_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Get booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking must be completed');
  END IF;

  -- Check if token already exists
  IF EXISTS (SELECT 1 FROM review_tokens WHERE booking_id = p_booking_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Review request already exists');
  END IF;

  -- Get location from property
  SELECT pl.tenant_location_id INTO v_location_id
  FROM properties p
  LEFT JOIN LATERAL (
    SELECT tl.id as tenant_location_id
    FROM tenant_locations tl
    WHERE tl.tenant_id = v_tenant_id
    ORDER BY tl.is_primary DESC
    LIMIT 1
  ) pl ON true
  WHERE p.id = v_booking.property_id;

  -- Generate token
  v_token := generate_review_token();
  v_token_hash := encode(sha256(v_token::bytea), 'hex');
  v_expires_at := NOW() + INTERVAL '30 days';

  -- Create review token
  INSERT INTO review_tokens (
    tenant_id,
    booking_id,
    customer_id,
    location_id,
    token,
    token_hash,
    expires_at
  ) VALUES (
    v_tenant_id,
    p_booking_id,
    v_booking.customer_id,
    v_location_id,
    v_token,
    v_token_hash,
    v_expires_at
  )
  RETURNING id INTO v_token_id;

  RETURN jsonb_build_object(
    'success', true,
    'token_id', v_token_id,
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Get Review by Token (Public)
-- Returns review info without requiring auth
-- ============================================================================

CREATE OR REPLACE FUNCTION get_review_by_token(
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_token_record RECORD;
  v_booking RECORD;
  v_customer RECORD;
  v_property RECORD;
  v_service RECORD;
  v_review_config RECORD;
BEGIN
  -- Find token
  SELECT * INTO v_token_record
  FROM review_tokens
  WHERE token = p_token;

  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  IF v_token_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token expired');
  END IF;

  IF v_token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Review already submitted', 'already_rated', true);
  END IF;

  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_token_record.booking_id;

  -- Get customer
  SELECT first_name, last_name INTO v_customer
  FROM customers
  WHERE id = v_token_record.customer_id;

  -- Get property
  SELECT address_line1, city, state INTO v_property
  FROM properties
  WHERE id = v_booking.property_id;

  -- Get service
  SELECT name INTO v_service
  FROM services
  WHERE id = v_booking.service_id;

  -- Get review config for location
  SELECT * INTO v_review_config
  FROM review_configs
  WHERE (location_id = v_token_record.location_id OR location_id IS NULL)
  AND tenant_id = v_token_record.tenant_id
  AND is_active = TRUE
  ORDER BY location_id NULLS LAST
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'token_id', v_token_record.id,
    'customer_name', v_customer.first_name,
    'service_name', v_service.name,
    'service_date', v_booking.scheduled_date,
    'property_address', v_property.address_line1 || ', ' || v_property.city,
    'internal_threshold', COALESCE(v_review_config.internal_threshold, 3),
    'has_google', v_review_config.google_review_url IS NOT NULL,
    'has_yelp', v_review_config.yelp_review_url IS NOT NULL,
    'has_facebook', v_review_config.facebook_review_url IS NOT NULL,
    'primary_platform', v_review_config.primary_platform
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Submit Review Rating (Public)
-- First step: customer submits rating
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_review_rating(
  p_token TEXT,
  p_rating INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_token_record RECORD;
  v_review_config RECORD;
  v_route review_route;
BEGIN
  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  -- Find and validate token
  SELECT * INTO v_token_record
  FROM review_tokens
  WHERE token = p_token;

  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  IF v_token_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token expired');
  END IF;

  IF v_token_record.rating IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating already submitted');
  END IF;

  -- Get review config
  SELECT * INTO v_review_config
  FROM review_configs
  WHERE (location_id = v_token_record.location_id OR location_id IS NULL)
  AND tenant_id = v_token_record.tenant_id
  AND is_active = TRUE
  ORDER BY location_id NULLS LAST
  LIMIT 1;

  -- Determine route
  IF p_rating <= COALESCE(v_review_config.internal_threshold, 3) THEN
    v_route := 'internal';
  ELSE
    v_route := COALESCE(v_review_config.primary_platform, 'google');
  END IF;

  -- Update token with rating
  UPDATE review_tokens
  SET
    rating = p_rating,
    rated_at = NOW(),
    route_taken = v_route
  WHERE id = v_token_record.id;

  -- Return routing info
  RETURN jsonb_build_object(
    'success', true,
    'route', v_route,
    'rating', p_rating,
    'google_url', CASE WHEN v_route != 'internal' THEN v_review_config.google_review_url END,
    'yelp_url', CASE WHEN v_route != 'internal' THEN v_review_config.yelp_review_url END,
    'facebook_url', CASE WHEN v_route != 'internal' THEN v_review_config.facebook_review_url END,
    'primary_platform', v_review_config.primary_platform
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Submit Internal Feedback (Public)
-- Second step: customer submits feedback after low rating
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_internal_feedback(
  p_token TEXT,
  p_feedback_text TEXT DEFAULT NULL,
  p_feedback_category TEXT DEFAULT NULL,
  p_wants_follow_up BOOLEAN DEFAULT FALSE,
  p_preferred_contact_method TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_token_record RECORD;
  v_feedback_id UUID;
BEGIN
  -- Find token
  SELECT * INTO v_token_record
  FROM review_tokens
  WHERE token = p_token;

  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  IF v_token_record.rating IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be submitted first');
  END IF;

  IF v_token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feedback already submitted');
  END IF;

  -- Create internal feedback record
  INSERT INTO internal_feedback (
    tenant_id,
    review_token_id,
    rating,
    feedback_text,
    feedback_category,
    wants_follow_up,
    preferred_contact_method
  ) VALUES (
    v_token_record.tenant_id,
    v_token_record.id,
    v_token_record.rating,
    p_feedback_text,
    p_feedback_category,
    p_wants_follow_up,
    p_preferred_contact_method
  )
  RETURNING id INTO v_feedback_id;

  -- Mark token as used
  UPDATE review_tokens
  SET used_at = NOW()
  WHERE id = v_token_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Track External Review Click (Public)
-- Records when customer clicks external review link
-- ============================================================================

CREATE OR REPLACE FUNCTION track_external_review_click(
  p_token TEXT,
  p_platform review_route
)
RETURNS JSONB AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Find token
  SELECT * INTO v_token_record
  FROM review_tokens
  WHERE token = p_token;

  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  -- Update token
  UPDATE review_tokens
  SET
    external_click_at = NOW(),
    route_taken = p_platform,
    used_at = COALESCE(used_at, NOW())
  WHERE id = v_token_record.id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Upsert Review Config
-- Staff configures review settings per location
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_review_config(
  p_location_id UUID DEFAULT NULL,
  p_google_place_id TEXT DEFAULT NULL,
  p_google_review_url TEXT DEFAULT NULL,
  p_yelp_business_id TEXT DEFAULT NULL,
  p_yelp_review_url TEXT DEFAULT NULL,
  p_facebook_page_id TEXT DEFAULT NULL,
  p_facebook_review_url TEXT DEFAULT NULL,
  p_custom_review_url TEXT DEFAULT NULL,
  p_primary_platform review_route DEFAULT 'google',
  p_secondary_platform review_route DEFAULT NULL,
  p_internal_threshold INTEGER DEFAULT 3,
  p_external_prompt_minimum INTEGER DEFAULT 4,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_config_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Upsert config
  INSERT INTO review_configs (
    tenant_id,
    location_id,
    google_place_id,
    google_review_url,
    yelp_business_id,
    yelp_review_url,
    facebook_page_id,
    facebook_review_url,
    custom_review_url,
    primary_platform,
    secondary_platform,
    internal_threshold,
    external_prompt_minimum,
    is_active
  ) VALUES (
    v_tenant_id,
    p_location_id,
    p_google_place_id,
    p_google_review_url,
    p_yelp_business_id,
    p_yelp_review_url,
    p_facebook_page_id,
    p_facebook_review_url,
    p_custom_review_url,
    p_primary_platform,
    p_secondary_platform,
    p_internal_threshold,
    p_external_prompt_minimum,
    p_is_active
  )
  ON CONFLICT (tenant_id, location_id) WHERE location_id IS NOT NULL
  DO UPDATE SET
    google_place_id = EXCLUDED.google_place_id,
    google_review_url = EXCLUDED.google_review_url,
    yelp_business_id = EXCLUDED.yelp_business_id,
    yelp_review_url = EXCLUDED.yelp_review_url,
    facebook_page_id = EXCLUDED.facebook_page_id,
    facebook_review_url = EXCLUDED.facebook_review_url,
    custom_review_url = EXCLUDED.custom_review_url,
    primary_platform = EXCLUDED.primary_platform,
    secondary_platform = EXCLUDED.secondary_platform,
    internal_threshold = EXCLUDED.internal_threshold,
    external_prompt_minimum = EXCLUDED.external_prompt_minimum,
    is_active = EXCLUDED.is_active
  RETURNING id INTO v_config_id;

  -- Handle default config (location_id IS NULL)
  IF p_location_id IS NULL AND v_config_id IS NULL THEN
    UPDATE review_configs
    SET
      google_place_id = p_google_place_id,
      google_review_url = p_google_review_url,
      yelp_business_id = p_yelp_business_id,
      yelp_review_url = p_yelp_review_url,
      facebook_page_id = p_facebook_page_id,
      facebook_review_url = p_facebook_review_url,
      custom_review_url = p_custom_review_url,
      primary_platform = p_primary_platform,
      secondary_platform = p_secondary_platform,
      internal_threshold = p_internal_threshold,
      external_prompt_minimum = p_external_prompt_minimum,
      is_active = p_is_active
    WHERE tenant_id = v_tenant_id AND location_id IS NULL
    RETURNING id INTO v_config_id;

    IF v_config_id IS NULL THEN
      INSERT INTO review_configs (
        tenant_id,
        location_id,
        google_place_id,
        google_review_url,
        yelp_business_id,
        yelp_review_url,
        facebook_page_id,
        facebook_review_url,
        custom_review_url,
        primary_platform,
        secondary_platform,
        internal_threshold,
        external_prompt_minimum,
        is_active
      ) VALUES (
        v_tenant_id,
        NULL,
        p_google_place_id,
        p_google_review_url,
        p_yelp_business_id,
        p_yelp_review_url,
        p_facebook_page_id,
        p_facebook_review_url,
        p_custom_review_url,
        p_primary_platform,
        p_secondary_platform,
        p_internal_threshold,
        p_external_prompt_minimum,
        p_is_active
      )
      RETURNING id INTO v_config_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'config_id', v_config_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grants
-- ============================================================================

-- Public functions (no auth required)
GRANT EXECUTE ON FUNCTION get_review_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_review_rating(TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_internal_feedback(TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION track_external_review_click(TEXT, review_route) TO anon, authenticated;

-- Staff functions
GRANT EXECUTE ON FUNCTION create_review_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_review_config(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, review_route, review_route, INTEGER, INTEGER, BOOLEAN) TO authenticated;

-- Table access
GRANT SELECT ON review_configs TO authenticated;
GRANT SELECT ON review_tokens TO authenticated;
GRANT SELECT ON internal_feedback TO authenticated;

-- ============================================================================
-- Unique constraint for default config
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_configs_tenant_default
  ON review_configs (tenant_id)
  WHERE location_id IS NULL;
