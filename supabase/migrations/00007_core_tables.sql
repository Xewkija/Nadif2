-- ============================================================================
-- Core Tables - Pass A
-- Phase 1A: Database Foundation
-- Creates all tables in dependency order with basic FKs
-- Deferred self-referential FKs added in Pass B
-- ============================================================================

-- ============================================================================
-- 1. Tenant Locations (D.1)
-- Physical locations where the business operates
-- ============================================================================

CREATE TABLE tenant_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_locations_tenant ON tenant_locations(tenant_id);
CREATE INDEX idx_tenant_locations_active ON tenant_locations(tenant_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 2. Service Categories (A.1)
-- Groupings for services in UI
-- ============================================================================

CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_categories_tenant ON service_categories(tenant_id);

-- ============================================================================
-- 3. Services (A.3)
-- Core service offerings
-- first_occurrence_override_service_id FK added in Pass B (self-referential)
-- ============================================================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  service_type service_type_code NOT NULL,

  -- Pricing
  base_price_cents INTEGER NOT NULL,
  min_price_cents INTEGER,
  max_price_cents INTEGER,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 120,

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,
  icon_name TEXT,
  color_hex TEXT,

  -- Booking behavior
  requires_quote BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_frequencies booking_frequency_code[] DEFAULT ARRAY['onetime', 'weekly', 'biweekly', 'monthly']::booking_frequency_code[],

  -- First occurrence override pairing (FK added in Pass B)
  first_occurrence_override_service_id UUID,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_services_active ON services(tenant_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_services_type ON services(tenant_id, service_type);

-- ============================================================================
-- 4. Add-ons (A.4)
-- Additional services that can be added to bookings
-- ============================================================================

CREATE TABLE add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_cents INTEGER NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'flat' CHECK (price_type IN ('flat', 'per_room', 'per_sqft', 'hourly')),

  -- Scoping
  scope_mode addon_scope_mode NOT NULL DEFAULT 'all_services',
  scoped_service_ids UUID[], -- When scope_mode = 'specific_services'
  scoped_service_types service_type_code[], -- When scope_mode = 'service_types'

  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,
  icon_name TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_add_ons_tenant ON add_ons(tenant_id);
CREATE INDEX idx_add_ons_active ON add_ons(tenant_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 5. Pricing Rules (A.5)
-- Rule-based pricing adjustments
-- ============================================================================

CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES tenant_locations(id) ON DELETE CASCADE,

  -- Rule definition
  name TEXT NOT NULL,
  description TEXT,
  category pricing_rule_category NOT NULL,
  trigger_type pricing_rule_trigger NOT NULL,

  -- Trigger conditions (JSONB for flexibility)
  trigger_conditions JSONB NOT NULL DEFAULT '{}',

  -- Adjustment
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'flat', 'multiplier')),
  adjustment_value NUMERIC(10, 4) NOT NULL,

  -- Scope
  applies_to_service_ids UUID[],
  applies_to_service_types service_type_code[],

  -- Priority and stacking
  priority INTEGER NOT NULL DEFAULT 0,
  is_stackable BOOLEAN NOT NULL DEFAULT TRUE,

  -- Validity
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_tenant ON pricing_rules(tenant_id);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(tenant_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pricing_rules_category ON pricing_rules(tenant_id, category);

-- ============================================================================
-- 6. Customers (Global Customer Model)
-- Customer records for the tenant
-- ============================================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  phone_secondary TEXT,

  -- Classification
  customer_type customer_type NOT NULL DEFAULT 'lead',

  -- Preferences
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms')),
  communication_preferences JSONB DEFAULT '{}',

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,

  -- Linked auth user (optional - for customer portal)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_email ON customers(tenant_id, email);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customers_type ON customers(tenant_id, customer_type);
CREATE INDEX idx_customers_active ON customers(tenant_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 7. Properties (E.10)
-- Customer properties/addresses
-- ============================================================================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Address (Google Places autocomplete + manual)
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',

  -- Geocoding
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  google_place_id TEXT,
  geocode_confidence geocode_confidence,
  geocoded_at TIMESTAMPTZ,

  -- Property details
  property_type property_type DEFAULT 'house',
  square_feet INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC(3, 1),
  floors INTEGER DEFAULT 1,

  -- Access info
  access_notes TEXT,
  gate_code TEXT,
  parking_instructions TEXT,
  key_location TEXT,

  -- Pets
  has_pets BOOLEAN DEFAULT FALSE,
  pet_details TEXT,

  -- Status
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Location assignment (resolved from coordinates)
  assigned_location_id UUID REFERENCES tenant_locations(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_tenant ON properties(tenant_id);
CREATE INDEX idx_properties_customer ON properties(customer_id);
CREATE INDEX idx_properties_location ON properties(assigned_location_id);
CREATE INDEX idx_properties_geo ON properties(tenant_id, latitude, longitude);

-- ============================================================================
-- 8. Recurring Series (C.1)
-- Stores the series definition, not individual occurrences
-- first_occurrence_override_service_id FK added in Pass B
-- ============================================================================

CREATE TABLE recurring_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Service (maintenance service - Option B model)
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,

  -- First occurrence override (FK added in Pass B)
  first_occurrence_override_service_id UUID,

  -- Schedule
  frequency booking_frequency_code NOT NULL,
  preferred_day_of_week INTEGER CHECK (preferred_day_of_week BETWEEN 0 AND 6),
  preferred_time_window time_window_code DEFAULT 'anytime',
  preferred_time_start TIME,
  preferred_time_end TIME,

  -- Custom frequency (when frequency = 'custom')
  custom_interval_days INTEGER,

  -- Series lifecycle
  status recurring_series_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence_date DATE,

  -- Generation
  horizon_weeks INTEGER NOT NULL DEFAULT 8,
  last_generated_date DATE,

  -- Pricing
  pricing_version INTEGER NOT NULL DEFAULT 1,
  recurring_pricing_snapshot JSONB,

  -- Pause tracking
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_series_tenant ON recurring_series(tenant_id);
CREATE INDEX idx_recurring_series_customer ON recurring_series(customer_id);
CREATE INDEX idx_recurring_series_active ON recurring_series(tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_recurring_series_next ON recurring_series(tenant_id, next_occurrence_date) WHERE status = 'active';

-- ============================================================================
-- 9. Bookings (B.1, C.2)
-- Individual booking instances
-- recurring_series_id FK added in Pass B
-- ============================================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,

  -- Recurring linkage (FK added in Pass B)
  recurring_series_id UUID,
  is_first_occurrence_override BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status (per B.1 state machine)
  status booking_status NOT NULL DEFAULT 'draft',

  -- Scheduling
  frequency booking_frequency_code NOT NULL DEFAULT 'onetime',
  scheduled_date DATE,
  scheduled_time_window time_window_code,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  estimated_duration_minutes INTEGER,

  -- Provider assignment
  assigned_provider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Execution tracking
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  actual_duration_minutes INTEGER,

  -- Pricing (A.6)
  pricing_snapshot JSONB,
  total_price_cents INTEGER,
  deposit_amount_cents INTEGER,
  deposit_paid BOOLEAN DEFAULT FALSE,

  -- Quote fields
  quote_sent_at TIMESTAMPTZ,
  quote_expires_at TIMESTAMPTZ,
  quote_accepted_at TIMESTAMPTZ,
  quote_version INTEGER DEFAULT 1,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  provider_notes TEXT,

  -- Completion
  completion_notes TEXT,
  completion_photos TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_date ON bookings(tenant_id, scheduled_date);
CREATE INDEX idx_bookings_provider ON bookings(assigned_provider_id, scheduled_date);
CREATE INDEX idx_bookings_series ON bookings(recurring_series_id);

-- ============================================================================
-- 10. Booking Add-ons (A.4)
-- Junction table for bookings and add-ons
-- ============================================================================

CREATE TABLE booking_add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  add_on_id UUID NOT NULL REFERENCES add_ons(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, add_on_id)
);

CREATE INDEX idx_booking_add_ons_booking ON booking_add_ons(booking_id);

-- ============================================================================
-- 11. Customer Property Service History (C.4)
-- Tracks completed services per property for deep clean evaluation
-- booking_id FK added in Pass B
-- ============================================================================

CREATE TABLE customer_property_service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  booking_id UUID, -- FK added in Pass B
  completed_at TIMESTAMPTZ NOT NULL,
  service_type service_type_code NOT NULL,
  was_deep_clean BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_history_property ON customer_property_service_history(property_id, completed_at DESC);
CREATE INDEX idx_service_history_customer ON customer_property_service_history(customer_id);
CREATE INDEX idx_service_history_deep_clean ON customer_property_service_history(property_id, was_deep_clean, completed_at DESC)
  WHERE was_deep_clean = TRUE;

-- ============================================================================
-- 12. Tenant Settings (G.3, C.3)
-- Global tenant configuration
-- default_first_occurrence_override_service_id FK added in Pass B
-- ============================================================================

CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

  -- First occurrence override default (FK added in Pass B)
  default_first_occurrence_override_service_id UUID,

  -- Business hours
  business_hours JSONB DEFAULT '{}',

  -- Booking settings
  min_lead_time_hours INTEGER DEFAULT 24,
  max_advance_booking_days INTEGER DEFAULT 90,
  default_booking_duration_minutes INTEGER DEFAULT 120,

  -- Quote settings
  quote_expiry_days INTEGER DEFAULT 7,
  auto_send_quote_reminders BOOLEAN DEFAULT TRUE,

  -- Payment settings
  require_card_on_file BOOLEAN DEFAULT FALSE,
  require_deposit BOOLEAN DEFAULT FALSE,
  default_deposit_percentage INTEGER DEFAULT 0,

  -- Review settings
  auto_send_review_request BOOLEAN DEFAULT TRUE,
  review_request_delay_hours INTEGER DEFAULT 2,

  -- Notification settings
  notification_preferences JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. Deep Clean Policies (C.4)
-- Configurable rules for deep clean requirements
-- ============================================================================

CREATE TABLE deep_clean_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Policy definition
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger conditions
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'days_since_last_deep',
    'cleanings_since_deep',
    'new_customer',
    'series_resume',
    'property_change'
  )),
  trigger_threshold INTEGER, -- e.g., 90 days, 12 cleanings

  -- Action
  action TEXT NOT NULL DEFAULT 'require' CHECK (action IN ('require', 'recommend', 'offer')),

  -- Scope
  applies_to_service_types service_type_code[],
  applies_to_frequencies booking_frequency_code[],

  -- Priority
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deep_clean_policies_tenant ON deep_clean_policies(tenant_id);

-- ============================================================================
-- 14. Service Prerequisite Policies (G.1)
-- Rules about service requirements
-- ============================================================================

CREATE TABLE service_prerequisite_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

  -- Prerequisite definition
  name TEXT NOT NULL,
  description TEXT,

  -- What's required
  prerequisite_type TEXT NOT NULL CHECK (prerequisite_type IN (
    'previous_service',
    'deep_clean_first',
    'property_inspection',
    'minimum_sqft',
    'maximum_sqft'
  )),

  -- Conditions
  prerequisite_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  prerequisite_value JSONB,

  -- Enforcement
  enforcement TEXT NOT NULL DEFAULT 'block' CHECK (enforcement IN ('block', 'warn', 'fee')),
  override_fee_cents INTEGER,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_prerequisites_tenant ON service_prerequisite_policies(tenant_id);
CREATE INDEX idx_service_prerequisites_service ON service_prerequisite_policies(service_id);

-- ============================================================================
-- 15. Access Policies (G.2)
-- Property access requirements
-- ============================================================================

CREATE TABLE access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Policy type
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'require_access_code',
    'require_key_on_file',
    'require_someone_present',
    'allow_unattended'
  )),

  -- Scope
  applies_to_property_types property_type[],
  applies_to_service_types service_type_code[],

  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_policies_tenant ON access_policies(tenant_id);

-- ============================================================================
-- 16. Payment Gate Policies (G.3)
-- Rules for payment requirements
-- ============================================================================

CREATE TABLE payment_gate_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Gate type
  gate_type TEXT NOT NULL CHECK (gate_type IN (
    'require_card_before_quote',
    'require_card_before_confirm',
    'require_deposit',
    'require_prepayment'
  )),

  -- Conditions
  trigger_conditions JSONB DEFAULT '{}',

  -- Amounts
  deposit_percentage INTEGER,
  deposit_flat_cents INTEGER,
  min_booking_amount_cents INTEGER,

  -- Scope
  applies_to_customer_types customer_type[],
  applies_to_service_types service_type_code[],

  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_gate_policies_tenant ON payment_gate_policies(tenant_id);

-- ============================================================================
-- 17. Approval Policies (G.4)
-- Rules requiring manager approval
-- ============================================================================

CREATE TABLE approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Trigger conditions
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'discount_threshold',
    'booking_value_threshold',
    'refund_request',
    'schedule_override',
    'out_of_area'
  )),
  trigger_threshold JSONB,

  -- Required approver role
  required_role user_role NOT NULL DEFAULT 'manager',

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_policies_tenant ON approval_policies(tenant_id);

-- ============================================================================
-- 18. Bookability Policies (G.5)
-- Rules for quote vs instant book
-- ============================================================================

CREATE TABLE bookability_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Policy type
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'always_quote',
    'always_instant',
    'conditional'
  )),

  -- Conditions (when policy_type = 'conditional')
  conditions JSONB DEFAULT '{}',

  -- Scope
  applies_to_service_ids UUID[],
  applies_to_service_types service_type_code[],
  applies_to_customer_types customer_type[],

  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookability_policies_tenant ON bookability_policies(tenant_id);

-- ============================================================================
-- 19. Reclean Policies (G.6)
-- Rules for reclean eligibility
-- ============================================================================

CREATE TABLE reclean_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Eligibility
  request_window_hours INTEGER NOT NULL DEFAULT 24,
  max_recleans_per_booking INTEGER NOT NULL DEFAULT 1,

  -- What's included
  included_services service_type_code[],
  excluded_add_ons UUID[],

  -- Requirements
  requires_photos BOOLEAN DEFAULT FALSE,
  requires_description BOOLEAN DEFAULT TRUE,

  -- Approval
  auto_approve BOOLEAN DEFAULT FALSE,
  auto_approve_threshold_hours INTEGER,

  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reclean_policies_tenant ON reclean_policies(tenant_id);

-- ============================================================================
-- 20. Review Configs (F.2)
-- Per-location review platform settings
-- ============================================================================

CREATE TABLE review_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES tenant_locations(id) ON DELETE CASCADE,

  -- Review platforms
  google_place_id TEXT,
  google_review_url TEXT,
  yelp_business_id TEXT,
  yelp_review_url TEXT,
  facebook_page_id TEXT,
  facebook_review_url TEXT,
  custom_review_url TEXT,

  -- Routing rules
  primary_platform review_route DEFAULT 'google',
  secondary_platform review_route,

  -- Thresholds
  internal_threshold INTEGER NOT NULL DEFAULT 3, -- 1-3 goes internal
  external_prompt_minimum INTEGER NOT NULL DEFAULT 4, -- 4-5 goes external

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_configs_tenant ON review_configs(tenant_id);
CREATE INDEX idx_review_configs_location ON review_configs(location_id);

-- ============================================================================
-- 21. Review Tokens (F.4)
-- Secure tokens for customer review access
-- ============================================================================

CREATE TABLE review_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES tenant_locations(id) ON DELETE SET NULL,

  -- Token
  token TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,

  -- State
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  rated_at TIMESTAMPTZ,
  route_taken review_route,
  external_click_at TIMESTAMPTZ,

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_tokens_token ON review_tokens(token);
CREATE INDEX idx_review_tokens_booking ON review_tokens(booking_id);
CREATE INDEX idx_review_tokens_tenant ON review_tokens(tenant_id);

-- ============================================================================
-- 22. Internal Feedback (F.5 - Capture Only)
-- Customer feedback that goes internal (1-3 stars)
-- Staff recovery workflow is Phase 2
-- ============================================================================

CREATE TABLE internal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  review_token_id UUID NOT NULL REFERENCES review_tokens(id) ON DELETE CASCADE,

  -- Feedback content
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  feedback_category TEXT,

  -- Contact preference
  wants_follow_up BOOLEAN DEFAULT FALSE,
  preferred_contact_method TEXT,

  -- Staff handling (Phase 2)
  -- assigned_to_id UUID REFERENCES profiles(id),
  -- status TEXT DEFAULT 'pending',
  -- resolved_at TIMESTAMPTZ,
  -- resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_internal_feedback_tenant ON internal_feedback(tenant_id);
CREATE INDEX idx_internal_feedback_token ON internal_feedback(review_token_id);

-- ============================================================================
-- Apply updated_at triggers to all new tables
-- ============================================================================

CREATE TRIGGER update_tenant_locations_updated_at
  BEFORE UPDATE ON tenant_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_add_ons_updated_at
  BEFORE UPDATE ON add_ons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_series_updated_at
  BEFORE UPDATE ON recurring_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deep_clean_policies_updated_at
  BEFORE UPDATE ON deep_clean_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_prerequisite_policies_updated_at
  BEFORE UPDATE ON service_prerequisite_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_policies_updated_at
  BEFORE UPDATE ON access_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_gate_policies_updated_at
  BEFORE UPDATE ON payment_gate_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_policies_updated_at
  BEFORE UPDATE ON approval_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookability_policies_updated_at
  BEFORE UPDATE ON bookability_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reclean_policies_updated_at
  BEFORE UPDATE ON reclean_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_configs_updated_at
  BEFORE UPDATE ON review_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE services IS 'Service offerings. One primary service per booking. Spec A.3.';
COMMENT ON COLUMN services.first_occurrence_override_service_id IS 'Service to use for first occurrence of recurring. Spec C.3.';
COMMENT ON TABLE recurring_series IS 'Recurring series definition. Option B model. Spec C.1.';
COMMENT ON TABLE bookings IS 'Individual booking instances. Spec B.1.';
COMMENT ON COLUMN bookings.is_first_occurrence_override IS 'True if this booking uses first occurrence override service. Spec C.2.';
COMMENT ON TABLE customer_property_service_history IS 'Service history for deep clean evaluation. Spec C.4.';
COMMENT ON TABLE internal_feedback IS 'Customer feedback (1-3 stars). Recovery workflow Phase 2. Spec F.5.';
