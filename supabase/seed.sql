-- ============================================================================
-- Nadif Development Seed Data
-- Run with: supabase db reset (includes migrations + seed)
-- Or manually: psql -f supabase/seed.sql
-- ============================================================================

-- This file creates sample data for development
-- It assumes a test user has already been created via the Supabase dashboard
-- or via signup flow

-- ============================================================================
-- Sample Services for any tenant
-- These are inserted when a tenant is created via create_tenant_with_owner
-- Run the service setup for each tenant manually or via onboarding flow
-- ============================================================================

-- Example: After creating a tenant, call these functions to set up services:
/*

-- Switch to the tenant workspace first
SELECT switch_workspace('YOUR_TENANT_ID');

-- Create service categories
INSERT INTO service_categories (tenant_id, name, description, display_order)
VALUES
  (get_active_tenant_id(), 'Residential', 'Home cleaning services', 1),
  (get_active_tenant_id(), 'Move Services', 'Moving-related cleaning', 2),
  (get_active_tenant_id(), 'Specialty', 'Special cleaning services', 3);

-- Create services
-- First, create the deep clean service (will be used as override)
INSERT INTO services (
  tenant_id, name, description, service_type, base_price_cents,
  estimated_duration_minutes, is_recurring_eligible
)
VALUES (
  get_active_tenant_id(),
  'Deep Clean',
  'Thorough deep cleaning service',
  'deep',
  25000,
  240,
  false
);

-- Then create standard clean with override pointing to deep clean
INSERT INTO services (
  tenant_id, name, description, service_type, base_price_cents,
  estimated_duration_minutes, is_recurring_eligible,
  first_occurrence_override_service_id
)
VALUES (
  get_active_tenant_id(),
  'Standard Clean',
  'Regular maintenance cleaning',
  'standard',
  15000,
  120,
  true,
  (SELECT id FROM services WHERE tenant_id = get_active_tenant_id() AND service_type = 'deep' LIMIT 1)
);

-- More services
INSERT INTO services (tenant_id, name, description, service_type, base_price_cents, estimated_duration_minutes, is_recurring_eligible)
VALUES
  (get_active_tenant_id(), 'Move-In Clean', 'Pre-move-in preparation', 'move_in', 30000, 300, false),
  (get_active_tenant_id(), 'Move-Out Clean', 'Post-move-out cleaning', 'move_out', 30000, 300, false),
  (get_active_tenant_id(), 'Post-Construction Clean', 'Construction debris cleanup', 'post_construction', 50000, 480, false);

-- Create add-ons
INSERT INTO add_ons (tenant_id, name, description, price_cents, price_type, scope_mode)
VALUES
  (get_active_tenant_id(), 'Inside Refrigerator', 'Clean inside refrigerator', 3500, 'flat', 'all_services'),
  (get_active_tenant_id(), 'Inside Oven', 'Clean inside oven', 4000, 'flat', 'all_services'),
  (get_active_tenant_id(), 'Inside Cabinets', 'Clean inside cabinets', 5000, 'flat', 'all_services'),
  (get_active_tenant_id(), 'Laundry (wash & fold)', 'One load of laundry', 2500, 'flat', 'all_services'),
  (get_active_tenant_id(), 'Window Cleaning (interior)', 'Interior window cleaning', 1500, 'per_room', 'all_services'),
  (get_active_tenant_id(), 'Garage Sweep', 'Sweep and organize garage', 4500, 'flat', 'all_services');

-- Create default deep clean policy
INSERT INTO deep_clean_policies (
  tenant_id, name, description, trigger_type, trigger_threshold, action, priority, is_active
)
VALUES
  (get_active_tenant_id(), 'New Customer Deep Clean', 'Require deep clean for new customers', 'new_customer', NULL, 'require', 100, true),
  (get_active_tenant_id(), 'Quarterly Deep Clean', 'Require deep clean every 90 days', 'days_since_last_deep', 90, 'recommend', 50, true),
  (get_active_tenant_id(), 'After 12 Cleanings', 'Require deep clean after 12 standard cleanings', 'cleanings_since_deep', 12, 'recommend', 40, true);

-- Set tenant default override service
UPDATE tenant_settings
SET default_first_occurrence_override_service_id = (
  SELECT id FROM services WHERE tenant_id = get_active_tenant_id() AND service_type = 'deep' LIMIT 1
)
WHERE tenant_id = get_active_tenant_id();

*/

-- ============================================================================
-- Quick Test Data Generator
-- Creates a complete test tenant with all data for development
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_dev_test_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_deep_clean_id UUID;
  v_standard_clean_id UUID;
  v_customer_id UUID;
  v_property_id UUID;
  v_booking_id UUID;
BEGIN
  -- Create tenant
  INSERT INTO tenants (name, slug)
  VALUES ('Dev Test Business', 'dev-test-' || substr(gen_random_uuid()::text, 1, 8))
  RETURNING id INTO v_tenant_id;

  -- Create membership
  INSERT INTO tenant_memberships (user_id, tenant_id, role, is_default)
  VALUES (p_user_id, v_tenant_id, 'owner', true);

  -- Initialize tenant settings (trigger should do this, but just in case)
  INSERT INTO tenant_settings (tenant_id)
  VALUES (v_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Create workspace session
  INSERT INTO user_workspace_sessions (user_id, active_tenant_id)
  VALUES (p_user_id, v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET active_tenant_id = v_tenant_id;

  -- Create deep clean service first
  INSERT INTO services (tenant_id, name, description, service_type, base_price_cents, estimated_duration_minutes, is_recurring_eligible)
  VALUES (v_tenant_id, 'Deep Clean', 'Thorough deep cleaning', 'deep', 25000, 240, false)
  RETURNING id INTO v_deep_clean_id;

  -- Create standard clean with override
  INSERT INTO services (tenant_id, name, description, service_type, base_price_cents, estimated_duration_minutes, is_recurring_eligible, first_occurrence_override_service_id)
  VALUES (v_tenant_id, 'Standard Clean', 'Regular cleaning', 'standard', 15000, 120, true, v_deep_clean_id)
  RETURNING id INTO v_standard_clean_id;

  -- Set tenant default
  UPDATE tenant_settings
  SET default_first_occurrence_override_service_id = v_deep_clean_id
  WHERE tenant_id = v_tenant_id;

  -- Create add-ons
  INSERT INTO add_ons (tenant_id, name, price_cents, price_type, scope_mode)
  VALUES
    (v_tenant_id, 'Inside Fridge', 3500, 'flat', 'all_services'),
    (v_tenant_id, 'Inside Oven', 4000, 'flat', 'all_services');

  -- Create test customer
  INSERT INTO customers (tenant_id, first_name, last_name, email, phone, customer_type)
  VALUES (v_tenant_id, 'Jane', 'Doe', 'jane@example.com', '555-123-4567', 'customer')
  RETURNING id INTO v_customer_id;

  -- Create test property
  INSERT INTO properties (
    tenant_id, customer_id, address_line1, city, state, postal_code,
    property_type, square_feet, bedrooms, bathrooms, is_primary
  )
  VALUES (
    v_tenant_id, v_customer_id, '123 Main St', 'Austin', 'TX', '78701',
    'house', 2000, 3, 2.5, true
  )
  RETURNING id INTO v_property_id;

  -- Create deep clean policy
  INSERT INTO deep_clean_policies (tenant_id, name, trigger_type, trigger_threshold, action, is_active)
  VALUES (v_tenant_id, 'New Customer Policy', 'new_customer', NULL, 'require', true);

  -- Create test draft booking
  INSERT INTO bookings (
    tenant_id, customer_id, property_id, service_id, status, frequency,
    scheduled_date, scheduled_time_window
  )
  VALUES (
    v_tenant_id, v_customer_id, v_property_id, v_standard_clean_id, 'draft', 'onetime',
    CURRENT_DATE + 7, 'morning'
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'customer_id', v_customer_id,
    'property_id', v_property_id,
    'booking_id', v_booking_id,
    'deep_clean_service_id', v_deep_clean_id,
    'standard_clean_service_id', v_standard_clean_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated users to generate test data
GRANT EXECUTE ON FUNCTION generate_dev_test_data(UUID) TO authenticated;

COMMENT ON FUNCTION generate_dev_test_data(UUID) IS
  'Generates complete test tenant with services, customers, and bookings for development.';
