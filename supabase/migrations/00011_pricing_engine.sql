-- ============================================================================
-- Pricing Engine
-- Phase 1A: Database Foundation
-- Canonical pricing calculation per Spec A.5
-- ============================================================================

-- ============================================================================
-- Calculate Booking Price
-- Single canonical pricing authority
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_booking_price(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_service RECORD;
  v_property RECORD;
  v_customer RECORD;
  v_base_price INTEGER;
  v_total INTEGER;
  v_breakdown JSONB;
  v_add_ons_total INTEGER;
  v_rules_applied JSONB;
  v_rule RECORD;
  v_adjustment INTEGER;
BEGIN
  v_tenant_id := get_active_tenant_id();

  -- Get booking with related data
  SELECT b.*, s.base_price_cents, s.service_type, s.name as service_name
  INTO v_booking
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  WHERE b.id = p_booking_id AND b.tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Get property details for property-based modifiers
  SELECT * INTO v_property
  FROM properties
  WHERE id = v_booking.property_id;

  -- Get customer for customer-based modifiers
  SELECT * INTO v_customer
  FROM customers
  WHERE id = v_booking.customer_id;

  -- Start with base price
  v_base_price := v_booking.base_price_cents;
  v_total := v_base_price;
  v_rules_applied := '[]'::JSONB;

  -- ============================================================================
  -- 10-Step Pricing Order per Spec A.5
  -- ============================================================================

  -- Step 1: Base service price (already set)

  -- Step 2: Property modifiers (sqft, beds, baths)
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    AND category = 'property_modifier'
    AND (
      (trigger_type = 'property_sqft' AND v_property.square_feet IS NOT NULL)
      OR (trigger_type = 'property_beds' AND v_property.bedrooms IS NOT NULL)
      OR (trigger_type = 'property_baths' AND v_property.bathrooms IS NOT NULL)
      OR (trigger_type = 'property_type')
    )
    ORDER BY priority DESC
  LOOP
    -- Evaluate trigger conditions
    IF v_rule.trigger_type = 'property_sqft' THEN
      IF v_property.square_feet >= COALESCE((v_rule.trigger_conditions->>'min_sqft')::INTEGER, 0)
         AND v_property.square_feet <= COALESCE((v_rule.trigger_conditions->>'max_sqft')::INTEGER, 999999) THEN
        v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
        v_total := v_total + v_adjustment;
        v_rules_applied := v_rules_applied || jsonb_build_object(
          'rule_id', v_rule.id,
          'name', v_rule.name,
          'adjustment', v_adjustment
        );
      END IF;
    ELSIF v_rule.trigger_type = 'property_beds' THEN
      IF v_property.bedrooms >= COALESCE((v_rule.trigger_conditions->>'min_beds')::INTEGER, 0) THEN
        v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
        v_total := v_total + v_adjustment;
        v_rules_applied := v_rules_applied || jsonb_build_object(
          'rule_id', v_rule.id,
          'name', v_rule.name,
          'adjustment', v_adjustment
        );
      END IF;
    ELSIF v_rule.trigger_type = 'property_type' THEN
      IF v_property.property_type::TEXT = v_rule.trigger_conditions->>'property_type' THEN
        v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
        v_total := v_total + v_adjustment;
        v_rules_applied := v_rules_applied || jsonb_build_object(
          'rule_id', v_rule.id,
          'name', v_rule.name,
          'adjustment', v_adjustment
        );
      END IF;
    END IF;
  END LOOP;

  -- Step 3: Service modifiers
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    AND category = 'service_modifier'
    AND (
      applies_to_service_ids IS NULL
      OR v_booking.service_id = ANY(applies_to_service_ids)
    )
    AND (
      applies_to_service_types IS NULL
      OR v_booking.service_type = ANY(applies_to_service_types)
    )
    ORDER BY priority DESC
  LOOP
    v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
    v_total := v_total + v_adjustment;
    v_rules_applied := v_rules_applied || jsonb_build_object(
      'rule_id', v_rule.id,
      'name', v_rule.name,
      'adjustment', v_adjustment
    );
  END LOOP;

  -- Step 4: Location modifiers
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    AND category = 'location_modifier'
    AND (location_id IS NULL OR location_id = v_property.assigned_location_id)
    ORDER BY priority DESC
  LOOP
    v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
    v_total := v_total + v_adjustment;
    v_rules_applied := v_rules_applied || jsonb_build_object(
      'rule_id', v_rule.id,
      'name', v_rule.name,
      'adjustment', v_adjustment
    );
  END LOOP;

  -- Step 5: Schedule modifiers (day of week, holiday, time of day)
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    AND category = 'schedule_modifier'
    AND (
      (trigger_type = 'day_of_week' AND v_booking.scheduled_date IS NOT NULL)
      OR trigger_type = 'holiday'
      OR trigger_type = 'time_of_day'
    )
    ORDER BY priority DESC
  LOOP
    IF v_rule.trigger_type = 'day_of_week' THEN
      IF EXTRACT(DOW FROM v_booking.scheduled_date) = ANY(
        ARRAY(SELECT jsonb_array_elements_text(v_rule.trigger_conditions->'days')::INTEGER)
      ) THEN
        v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
        v_total := v_total + v_adjustment;
        v_rules_applied := v_rules_applied || jsonb_build_object(
          'rule_id', v_rule.id,
          'name', v_rule.name,
          'adjustment', v_adjustment
        );
      END IF;
    END IF;
    -- Holiday and time_of_day checks would go here
  END LOOP;

  -- Step 6: Lead time modifiers
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    AND category = 'lead_time_modifier'
    AND trigger_type = 'lead_time_days'
    AND v_booking.scheduled_date IS NOT NULL
    ORDER BY priority DESC
  LOOP
    DECLARE
      v_lead_days INTEGER;
    BEGIN
      v_lead_days := v_booking.scheduled_date - CURRENT_DATE;
      IF v_lead_days <= COALESCE((v_rule.trigger_conditions->>'max_days')::INTEGER, 999) THEN
        v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
        v_total := v_total + v_adjustment;
        v_rules_applied := v_rules_applied || jsonb_build_object(
          'rule_id', v_rule.id,
          'name', v_rule.name,
          'adjustment', v_adjustment
        );
      END IF;
    END;
  END LOOP;

  -- Step 7: Frequency discounts
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    AND category = 'frequency_discount'
    AND trigger_type = 'frequency'
    ORDER BY priority DESC
  LOOP
    IF v_booking.frequency::TEXT = v_rule.trigger_conditions->>'frequency' THEN
      v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
      v_total := v_total + v_adjustment;
      v_rules_applied := v_rules_applied || jsonb_build_object(
        'rule_id', v_rule.id,
        'name', v_rule.name,
        'adjustment', v_adjustment
      );
    END IF;
  END LOOP;

  -- Step 8: Customer discounts
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    AND category = 'customer_discount'
    AND trigger_type = 'customer_type'
    ORDER BY priority DESC
  LOOP
    IF v_customer.customer_type::TEXT = v_rule.trigger_conditions->>'customer_type' THEN
      v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
      v_total := v_total + v_adjustment;
      v_rules_applied := v_rules_applied || jsonb_build_object(
        'rule_id', v_rule.id,
        'name', v_rule.name,
        'adjustment', v_adjustment
      );
    END IF;
  END LOOP;

  -- Step 9: Add-ons
  SELECT COALESCE(SUM(ba.price_cents * ba.quantity), 0)
  INTO v_add_ons_total
  FROM booking_add_ons ba
  WHERE ba.booking_id = p_booking_id;

  v_total := v_total + v_add_ons_total;

  -- Step 10: Fees and taxes
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    AND category IN ('fee', 'tax')
    AND trigger_type = 'always'
    ORDER BY category, priority DESC
  LOOP
    v_adjustment := calculate_adjustment(v_total, v_rule.adjustment_type, v_rule.adjustment_value);
    v_total := v_total + v_adjustment;
    v_rules_applied := v_rules_applied || jsonb_build_object(
      'rule_id', v_rule.id,
      'name', v_rule.name,
      'adjustment', v_adjustment
    );
  END LOOP;

  -- Build breakdown
  v_breakdown := jsonb_build_object(
    'base_price_cents', v_base_price,
    'service_name', v_booking.service_name,
    'service_type', v_booking.service_type,
    'add_ons_total_cents', v_add_ons_total,
    'rules_applied', v_rules_applied,
    'calculated_at', NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'total_cents', v_total,
    'breakdown', v_breakdown
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION calculate_booking_price(UUID) TO authenticated;

-- ============================================================================
-- Helper: Calculate adjustment based on type
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_adjustment(
  p_current_total INTEGER,
  p_adjustment_type TEXT,
  p_adjustment_value NUMERIC
)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_adjustment_type
    WHEN 'percentage' THEN ROUND(p_current_total * (p_adjustment_value / 100))::INTEGER
    WHEN 'flat' THEN p_adjustment_value::INTEGER
    WHEN 'multiplier' THEN ROUND(p_current_total * (p_adjustment_value - 1))::INTEGER
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Calculate Price Preview (for wizard without saved booking)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_price_preview(
  p_service_id UUID,
  p_property_id UUID,
  p_customer_id UUID,
  p_frequency booking_frequency_code DEFAULT 'onetime',
  p_scheduled_date DATE DEFAULT NULL,
  p_add_on_ids UUID[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_service RECORD;
  v_property RECORD;
  v_customer RECORD;
  v_base_price INTEGER;
  v_total INTEGER;
  v_add_ons_total INTEGER;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Get service
  SELECT * INTO v_service
  FROM services
  WHERE id = p_service_id AND tenant_id = v_tenant_id AND is_active = TRUE;

  IF v_service IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- Get property if provided
  IF p_property_id IS NOT NULL THEN
    SELECT * INTO v_property
    FROM properties
    WHERE id = p_property_id AND tenant_id = v_tenant_id;
  END IF;

  -- Get customer if provided
  IF p_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer
    FROM customers
    WHERE id = p_customer_id AND tenant_id = v_tenant_id;
  END IF;

  v_base_price := v_service.base_price_cents;
  v_total := v_base_price;

  -- Calculate add-ons if provided
  IF p_add_on_ids IS NOT NULL AND array_length(p_add_on_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price_cents), 0)
    INTO v_add_ons_total
    FROM add_ons
    WHERE id = ANY(p_add_on_ids)
    AND tenant_id = v_tenant_id
    AND is_active = TRUE;

    v_total := v_total + v_add_ons_total;
  ELSE
    v_add_ons_total := 0;
  END IF;

  -- Note: Full rule application would mirror calculate_booking_price
  -- This is a simplified preview

  RETURN jsonb_build_object(
    'success', true,
    'base_price_cents', v_base_price,
    'add_ons_cents', v_add_ons_total,
    'estimated_total_cents', v_total,
    'service_name', v_service.name,
    'service_type', v_service.service_type,
    'note', 'Preview estimate. Final price calculated on booking creation.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION calculate_price_preview(UUID, UUID, UUID, booking_frequency_code, DATE, UUID[]) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION calculate_booking_price(UUID) IS
  'Canonical pricing engine. Single source of truth for booking prices. Spec A.5.';

COMMENT ON FUNCTION calculate_price_preview(UUID, UUID, UUID, booking_frequency_code, DATE, UUID[]) IS
  'Preview pricing for wizard before booking is saved.';
