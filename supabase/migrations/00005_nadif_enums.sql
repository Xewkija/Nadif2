-- ============================================================================
-- Nadif Core Enums
-- Phase 1A: Database Foundation
-- These enums are LOCKED per CLAUDE.md. Do not modify values.
-- ============================================================================

-- Service type codes (canonical)
-- FORBIDDEN deprecated names: move, construction, service_type_modifier
CREATE TYPE service_type_code AS ENUM (
  'standard',
  'deep',
  'move_in',
  'move_out',
  'post_construction',
  'commercial',
  'specialty'
);

-- Booking frequency codes (canonical)
-- FORBIDDEN deprecated names: booking_frequency
CREATE TYPE booking_frequency_code AS ENUM (
  'onetime',
  'weekly',
  'biweekly',
  'monthly',
  'custom'
);

-- Booking status (canonical state machine)
-- FORBIDDEN deprecated names: quote_sent
CREATE TYPE booking_status AS ENUM (
  'draft',
  'quote_pending',
  'quote_accepted',
  'quote_expired',
  'quote_declined',
  'confirmed',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'skipped'
);

-- Recurring series status
CREATE TYPE recurring_series_status AS ENUM (
  'active',
  'paused',
  'cancelled'
);

-- Pricing rule categories
CREATE TYPE pricing_rule_category AS ENUM (
  'property_modifier',
  'service_modifier',
  'location_modifier',
  'schedule_modifier',
  'lead_time_modifier',
  'frequency_discount',
  'customer_discount',
  'promotional',
  'referral',
  'loyalty',
  'manual_adjustment',
  'fee',
  'tax'
);

-- Pricing rule triggers
CREATE TYPE pricing_rule_trigger AS ENUM (
  'always',
  'property_sqft',
  'property_beds',
  'property_baths',
  'property_type',
  'day_of_week',
  'holiday',
  'time_of_day',
  'lead_time_days',
  'frequency',
  'customer_type',
  'promo_code',
  'manual'
);

-- Customer type
CREATE TYPE customer_type AS ENUM (
  'lead',
  'customer',
  'repeat',
  'vip',
  'inactive',
  'do_not_service'
);

-- Time window options for scheduling
CREATE TYPE time_window_code AS ENUM (
  'morning',
  'afternoon',
  'anytime',
  'specific',
  'exact'
);

-- User roles (extended from tenant_role)
-- This is the comprehensive role enum for all staff surfaces
CREATE TYPE user_role AS ENUM (
  'owner',
  'admin',
  'manager',
  'scheduler',
  'provider'
);

-- Geocode confidence levels
CREATE TYPE geocode_confidence AS ENUM (
  'high',
  'low',
  'failed',
  'manual'
);

-- Review routing destinations
CREATE TYPE review_route AS ENUM (
  'internal',
  'google',
  'yelp',
  'facebook',
  'custom'
);

-- Property type
CREATE TYPE property_type AS ENUM (
  'apartment',
  'house',
  'condo',
  'townhouse',
  'studio',
  'office',
  'commercial',
  'other'
);

-- Add-on scoping mode (per Spec A.4)
CREATE TYPE addon_scope_mode AS ENUM (
  'all_services',
  'specific_services',
  'service_types'
);

-- ============================================================================
-- Comments documenting locked decisions
-- ============================================================================

COMMENT ON TYPE service_type_code IS 'Canonical service types. Locked per Spec A.';
COMMENT ON TYPE booking_frequency_code IS 'Canonical frequencies. Locked per Spec C.';
COMMENT ON TYPE booking_status IS 'Canonical booking statuses including skipped for recurring. Locked per Spec B.1.';
COMMENT ON TYPE recurring_series_status IS 'Recurring series lifecycle states. Locked per Spec C.5.';
COMMENT ON TYPE customer_type IS 'Customer classification for pricing and policies.';
COMMENT ON TYPE user_role IS 'Staff role hierarchy for permissions.';
