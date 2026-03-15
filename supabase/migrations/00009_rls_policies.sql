-- ============================================================================
-- RLS Policies for All Nadif Tables
-- Phase 1A: Database Foundation
-- All tenant-scoped tables use get_active_tenant_id() for workspace isolation
-- ============================================================================

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE tenant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_property_service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_clean_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_prerequisite_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gate_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookability_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reclean_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper function to check if user has manager+ role in active workspace
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_manager_access()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships tm
    JOIN user_workspace_sessions ws ON ws.active_tenant_id = tm.tenant_id
    WHERE tm.user_id = auth.uid()
    AND ws.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION user_has_manager_access() TO authenticated;

-- ============================================================================
-- Tenant Locations
-- ============================================================================

CREATE POLICY "workspace_isolation" ON tenant_locations
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Service Categories
-- ============================================================================

CREATE POLICY "workspace_isolation" ON service_categories
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Services
-- ============================================================================

CREATE POLICY "workspace_isolation" ON services
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Add-ons
-- ============================================================================

CREATE POLICY "workspace_isolation" ON add_ons
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Pricing Rules
-- ============================================================================

CREATE POLICY "workspace_isolation" ON pricing_rules
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Customers
-- ============================================================================

CREATE POLICY "workspace_isolation" ON customers
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Properties
-- ============================================================================

CREATE POLICY "workspace_isolation" ON properties
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Recurring Series
-- ============================================================================

CREATE POLICY "workspace_isolation" ON recurring_series
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Bookings
-- ============================================================================

CREATE POLICY "workspace_isolation" ON bookings
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Booking Add-ons
-- Via booking relationship (no direct tenant_id)
-- ============================================================================

CREATE POLICY "via_booking" ON booking_add_ons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
      AND bookings.tenant_id = get_active_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
      AND bookings.tenant_id = get_active_tenant_id()
    )
  );

-- ============================================================================
-- Customer Property Service History
-- ============================================================================

CREATE POLICY "workspace_isolation" ON customer_property_service_history
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Tenant Settings
-- ============================================================================

CREATE POLICY "workspace_isolation" ON tenant_settings
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Deep Clean Policies
-- ============================================================================

CREATE POLICY "workspace_isolation" ON deep_clean_policies
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Service Prerequisite Policies
-- ============================================================================

CREATE POLICY "workspace_isolation" ON service_prerequisite_policies
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Access Policies
-- ============================================================================

CREATE POLICY "workspace_isolation" ON access_policies
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Payment Gate Policies
-- ============================================================================

CREATE POLICY "workspace_isolation" ON payment_gate_policies
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Approval Policies
-- ============================================================================

CREATE POLICY "workspace_isolation" ON approval_policies
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Bookability Policies
-- ============================================================================

CREATE POLICY "workspace_isolation" ON bookability_policies
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Reclean Policies
-- ============================================================================

CREATE POLICY "workspace_isolation" ON reclean_policies
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Review Configs
-- ============================================================================

CREATE POLICY "workspace_isolation" ON review_configs
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Review Tokens
-- Staff can see tokens for their workspace
-- Public access for token lookup is via RPC (bypasses RLS)
-- ============================================================================

CREATE POLICY "workspace_isolation" ON review_tokens
  FOR SELECT USING (tenant_id = get_active_tenant_id());

CREATE POLICY "workspace_insert" ON review_tokens
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id());

-- Customers can update their own token (via RPC typically)
CREATE POLICY "token_owner_update" ON review_tokens
  FOR UPDATE USING (
    -- Token owner can update (for rating submission)
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = review_tokens.customer_id
      AND c.auth_user_id = auth.uid()
    )
    OR tenant_id = get_active_tenant_id()
  );

-- ============================================================================
-- Internal Feedback
-- ============================================================================

CREATE POLICY "workspace_isolation" ON internal_feedback
  FOR ALL USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Public access RPC for review token lookup
-- This bypasses RLS for customer-facing review flow
-- ============================================================================

CREATE OR REPLACE FUNCTION lookup_review_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'valid', true,
    'token_id', rt.id,
    'booking_id', rt.booking_id,
    'customer_id', rt.customer_id,
    'rated', rt.rating IS NOT NULL,
    'rating', rt.rating,
    'expired', rt.expires_at < NOW(),
    'location_id', rt.location_id
  ) INTO v_result
  FROM review_tokens rt
  WHERE rt.token = p_token;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token not found');
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous access for customer review flow
GRANT EXECUTE ON FUNCTION lookup_review_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION lookup_review_token(TEXT) TO authenticated;

-- ============================================================================
-- Public access RPC for submitting review rating
-- This bypasses RLS for customer-facing review flow
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_review_rating(
  p_token TEXT,
  p_rating INTEGER,
  p_feedback_text TEXT DEFAULT NULL,
  p_feedback_category TEXT DEFAULT NULL,
  p_wants_follow_up BOOLEAN DEFAULT FALSE,
  p_preferred_contact_method TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_token_record RECORD;
  v_review_config RECORD;
  v_route review_route;
  v_external_url TEXT;
BEGIN
  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  -- Get token record
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
    RETURN jsonb_build_object('success', false, 'error', 'Already rated');
  END IF;

  -- Get review config for routing
  SELECT * INTO v_review_config
  FROM review_configs
  WHERE tenant_id = v_token_record.tenant_id
  AND (location_id = v_token_record.location_id OR location_id IS NULL)
  AND is_active = TRUE
  ORDER BY location_id NULLS LAST
  LIMIT 1;

  -- Determine route based on rating
  IF p_rating <= COALESCE(v_review_config.internal_threshold, 3) THEN
    v_route := 'internal';
  ELSE
    v_route := COALESCE(v_review_config.primary_platform, 'google');

    -- Get external URL
    CASE v_route
      WHEN 'google' THEN v_external_url := v_review_config.google_review_url;
      WHEN 'yelp' THEN v_external_url := v_review_config.yelp_review_url;
      WHEN 'facebook' THEN v_external_url := v_review_config.facebook_review_url;
      WHEN 'custom' THEN v_external_url := v_review_config.custom_review_url;
      ELSE v_external_url := NULL;
    END CASE;
  END IF;

  -- Update token with rating
  UPDATE review_tokens
  SET rating = p_rating,
      rated_at = NOW(),
      route_taken = v_route,
      used_at = NOW()
  WHERE id = v_token_record.id;

  -- If internal route, create internal feedback record
  IF v_route = 'internal' THEN
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
      p_rating,
      p_feedback_text,
      p_feedback_category,
      p_wants_follow_up,
      p_preferred_contact_method
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'route', v_route,
    'external_url', v_external_url
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous access for customer review flow
GRANT EXECUTE ON FUNCTION submit_review_rating(TEXT, INTEGER, TEXT, TEXT, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION submit_review_rating(TEXT, INTEGER, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
