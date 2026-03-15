-- ============================================================================
-- Deferred Foreign Key Constraints - Pass B
-- Phase 1A: Database Foundation
-- Adds FKs that couldn't be created during table creation due to dependencies
-- ============================================================================

-- ============================================================================
-- 1. Services: Self-referential FK for first occurrence override
-- ============================================================================

ALTER TABLE services
ADD CONSTRAINT fk_services_first_occurrence_override
FOREIGN KEY (first_occurrence_override_service_id)
REFERENCES services(id)
ON DELETE SET NULL;

-- ============================================================================
-- 2. Tenant Settings: FK to services for default override
-- ============================================================================

ALTER TABLE tenant_settings
ADD CONSTRAINT fk_tenant_settings_default_override
FOREIGN KEY (default_first_occurrence_override_service_id)
REFERENCES services(id)
ON DELETE SET NULL;

-- ============================================================================
-- 3. Recurring Series: FK for first occurrence override service
-- ============================================================================

ALTER TABLE recurring_series
ADD CONSTRAINT fk_series_first_occurrence_override
FOREIGN KEY (first_occurrence_override_service_id)
REFERENCES services(id)
ON DELETE SET NULL;

-- ============================================================================
-- 4. Bookings: FK to recurring_series
-- ============================================================================

ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_recurring_series
FOREIGN KEY (recurring_series_id)
REFERENCES recurring_series(id)
ON DELETE SET NULL;

-- ============================================================================
-- 5. Customer Property Service History: FK to bookings
-- ============================================================================

ALTER TABLE customer_property_service_history
ADD CONSTRAINT fk_service_history_booking
FOREIGN KEY (booking_id)
REFERENCES bookings(id)
ON DELETE SET NULL;

-- ============================================================================
-- Validation functions for override service pairing
-- These enforce business rules beyond simple FKs:
-- - Same tenant
-- - is_active = true
-- - archived_at IS NULL
-- ============================================================================

-- Validate service override pairing for services table
CREATE OR REPLACE FUNCTION validate_service_override_pairing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_occurrence_override_service_id IS NOT NULL THEN
    -- Check override service is valid
    IF NOT EXISTS (
      SELECT 1 FROM services
      WHERE id = NEW.first_occurrence_override_service_id
      AND tenant_id = NEW.tenant_id
      AND is_active = TRUE
      AND archived_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Invalid first_occurrence_override_service_id: must be same tenant, active, and not archived';
    END IF;

    -- Prevent self-reference
    IF NEW.first_occurrence_override_service_id = NEW.id THEN
      RAISE EXCEPTION 'Service cannot be its own first occurrence override';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_service_override
  BEFORE INSERT OR UPDATE OF first_occurrence_override_service_id ON services
  FOR EACH ROW
  WHEN (NEW.first_occurrence_override_service_id IS NOT NULL)
  EXECUTE FUNCTION validate_service_override_pairing();

-- Validate tenant settings default override
CREATE OR REPLACE FUNCTION validate_tenant_settings_override()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.default_first_occurrence_override_service_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM services
      WHERE id = NEW.default_first_occurrence_override_service_id
      AND tenant_id = NEW.tenant_id
      AND is_active = TRUE
      AND archived_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Invalid default_first_occurrence_override_service_id: must be same tenant, active, and not archived';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_tenant_default_override
  BEFORE INSERT OR UPDATE OF default_first_occurrence_override_service_id ON tenant_settings
  FOR EACH ROW
  WHEN (NEW.default_first_occurrence_override_service_id IS NOT NULL)
  EXECUTE FUNCTION validate_tenant_settings_override();

-- Validate recurring series override
CREATE OR REPLACE FUNCTION validate_series_override()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_occurrence_override_service_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM services
      WHERE id = NEW.first_occurrence_override_service_id
      AND tenant_id = NEW.tenant_id
      AND is_active = TRUE
      AND archived_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Invalid first_occurrence_override_service_id: must be same tenant, active, and not archived';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_series_override
  BEFORE INSERT OR UPDATE OF first_occurrence_override_service_id ON recurring_series
  FOR EACH ROW
  WHEN (NEW.first_occurrence_override_service_id IS NOT NULL)
  EXECUTE FUNCTION validate_series_override();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON CONSTRAINT fk_services_first_occurrence_override ON services IS
  'Service-level pairing for first occurrence override. Spec C.3.';

COMMENT ON CONSTRAINT fk_tenant_settings_default_override ON tenant_settings IS
  'Tenant-level default for first occurrence override. Spec C.3.';

COMMENT ON CONSTRAINT fk_series_first_occurrence_override ON recurring_series IS
  'Series-level override for first occurrence. Spec C.3.';
