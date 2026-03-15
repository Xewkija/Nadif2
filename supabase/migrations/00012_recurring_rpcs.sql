-- ============================================================================
-- Recurring Series RPCs
-- Phase 1A: Database Foundation
-- Per Spec C.1-C.6 and locked decisions
-- ============================================================================

-- ============================================================================
-- Resolve First Occurrence Override Service
-- Per Spec C.3 precedence:
-- 1. service.first_occurrence_override_service_id
-- 2. tenant_settings.default_first_occurrence_override_service_id
-- 3. BLOCK if neither (returns error)
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_first_occurrence_override(p_service_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_service RECORD;
  v_tenant_settings RECORD;
  v_override_service_id UUID;
  v_override_service RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Get the maintenance service
  SELECT * INTO v_service
  FROM services
  WHERE id = p_service_id AND tenant_id = v_tenant_id;

  IF v_service IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- Check if service is recurring-eligible
  IF NOT v_service.is_recurring_eligible THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service is not eligible for recurring');
  END IF;

  -- Step 1: Check service-level override
  IF v_service.first_occurrence_override_service_id IS NOT NULL THEN
    v_override_service_id := v_service.first_occurrence_override_service_id;
  ELSE
    -- Step 2: Check tenant-level default
    SELECT * INTO v_tenant_settings
    FROM tenant_settings
    WHERE tenant_id = v_tenant_id;

    IF v_tenant_settings IS NOT NULL AND v_tenant_settings.default_first_occurrence_override_service_id IS NOT NULL THEN
      v_override_service_id := v_tenant_settings.default_first_occurrence_override_service_id;
    ELSE
      -- Step 3: BLOCK - no override configured
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No first occurrence override configured',
        'resolution', 'Configure first_occurrence_override_service_id on the service or set default_first_occurrence_override_service_id in tenant settings'
      );
    END IF;
  END IF;

  -- Validate override service
  SELECT * INTO v_override_service
  FROM services
  WHERE id = v_override_service_id
  AND tenant_id = v_tenant_id
  AND is_active = TRUE
  AND archived_at IS NULL;

  IF v_override_service IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Configured override service is not valid (inactive or archived)'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'maintenance_service_id', p_service_id,
    'maintenance_service_name', v_service.name,
    'override_service_id', v_override_service_id,
    'override_service_name', v_override_service.name,
    'override_service_type', v_override_service.service_type,
    'resolution_source', CASE
      WHEN v_service.first_occurrence_override_service_id IS NOT NULL THEN 'service'
      ELSE 'tenant_default'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION resolve_first_occurrence_override(UUID) TO authenticated;

-- ============================================================================
-- Evaluate Deep Clean Required
-- Per Spec C.4: Computed from history + policy, not stale booleans
-- ============================================================================

CREATE OR REPLACE FUNCTION evaluate_deep_clean_required(
  p_customer_id UUID,
  p_property_id UUID,
  p_service_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_last_deep_clean RECORD;
  v_last_any_clean RECORD;
  v_cleans_since_deep INTEGER;
  v_days_since_deep INTEGER;
  v_policy RECORD;
  v_required BOOLEAN;
  v_reason TEXT;
  v_reasons JSONB;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  v_required := FALSE;
  v_reasons := '[]'::JSONB;

  -- Get last deep clean for this property
  SELECT * INTO v_last_deep_clean
  FROM customer_property_service_history
  WHERE property_id = p_property_id
  AND was_deep_clean = TRUE
  ORDER BY completed_at DESC
  LIMIT 1;

  -- Get last any clean for this property
  SELECT * INTO v_last_any_clean
  FROM customer_property_service_history
  WHERE property_id = p_property_id
  ORDER BY completed_at DESC
  LIMIT 1;

  -- Check if this is a new customer/property (never cleaned)
  IF v_last_any_clean IS NULL THEN
    v_required := TRUE;
    v_reason := 'New customer - first service requires deep clean';
    v_reasons := v_reasons || jsonb_build_object('type', 'new_customer', 'reason', v_reason);
  END IF;

  -- Calculate days and cleanings since deep clean
  IF v_last_deep_clean IS NOT NULL THEN
    v_days_since_deep := EXTRACT(DAY FROM NOW() - v_last_deep_clean.completed_at);

    SELECT COUNT(*) INTO v_cleans_since_deep
    FROM customer_property_service_history
    WHERE property_id = p_property_id
    AND completed_at > v_last_deep_clean.completed_at
    AND was_deep_clean = FALSE;
  ELSE
    -- Never had a deep clean
    v_days_since_deep := NULL;
    v_cleans_since_deep := (
      SELECT COUNT(*) FROM customer_property_service_history
      WHERE property_id = p_property_id
    );
  END IF;

  -- Evaluate policies
  FOR v_policy IN
    SELECT * FROM deep_clean_policies
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    ORDER BY priority DESC
  LOOP
    CASE v_policy.trigger_type
      WHEN 'days_since_last_deep' THEN
        IF v_days_since_deep IS NOT NULL AND v_days_since_deep >= COALESCE(v_policy.trigger_threshold, 90) THEN
          v_required := TRUE;
          v_reason := format('Deep clean required: %s days since last deep clean (threshold: %s)', v_days_since_deep, v_policy.trigger_threshold);
          v_reasons := v_reasons || jsonb_build_object('type', 'days_since_deep', 'reason', v_reason, 'policy_id', v_policy.id);
        END IF;

      WHEN 'cleanings_since_deep' THEN
        IF v_cleans_since_deep >= COALESCE(v_policy.trigger_threshold, 12) THEN
          v_required := TRUE;
          v_reason := format('Deep clean required: %s cleanings since last deep clean (threshold: %s)', v_cleans_since_deep, v_policy.trigger_threshold);
          v_reasons := v_reasons || jsonb_build_object('type', 'cleanings_since_deep', 'reason', v_reason, 'policy_id', v_policy.id);
        END IF;

      WHEN 'new_customer' THEN
        IF v_last_any_clean IS NULL THEN
          v_required := TRUE;
          v_reason := 'Policy: New customers require initial deep clean';
          v_reasons := v_reasons || jsonb_build_object('type', 'new_customer_policy', 'reason', v_reason, 'policy_id', v_policy.id);
        END IF;

      ELSE
        -- Other policy types handled as needed
        NULL;
    END CASE;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'required', v_required,
    'reasons', v_reasons,
    'history', jsonb_build_object(
      'last_deep_clean_at', v_last_deep_clean.completed_at,
      'days_since_deep_clean', v_days_since_deep,
      'cleanings_since_deep_clean', v_cleans_since_deep,
      'last_any_clean_at', v_last_any_clean.completed_at
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION evaluate_deep_clean_required(UUID, UUID, UUID) TO authenticated;

-- ============================================================================
-- Create Recurring Series
-- Per Spec C.1: Option B model - series stores maintenance service
-- First occurrence uses override service
-- ============================================================================

CREATE OR REPLACE FUNCTION create_recurring_series(
  p_customer_id UUID,
  p_property_id UUID,
  p_service_id UUID,
  p_frequency booking_frequency_code,
  p_start_date DATE,
  p_preferred_day_of_week INTEGER DEFAULT NULL,
  p_preferred_time_window time_window_code DEFAULT 'anytime',
  p_end_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_generate_first_occurrence BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_series_id UUID;
  v_override_result JSONB;
  v_first_booking_id UUID;
  v_pricing JSONB;
  v_deep_clean_result JSONB;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Validate frequency
  IF p_frequency = 'onetime' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot create recurring series with onetime frequency');
  END IF;

  -- Resolve first occurrence override
  v_override_result := resolve_first_occurrence_override(p_service_id);

  IF NOT (v_override_result->>'success')::BOOLEAN THEN
    RETURN v_override_result;
  END IF;

  -- Check if deep clean is required for first occurrence
  v_deep_clean_result := evaluate_deep_clean_required(p_customer_id, p_property_id, p_service_id);

  -- Create series
  INSERT INTO recurring_series (
    tenant_id,
    customer_id,
    property_id,
    service_id,
    first_occurrence_override_service_id,
    frequency,
    start_date,
    end_date,
    preferred_day_of_week,
    preferred_time_window,
    status,
    next_occurrence_date,
    notes
  ) VALUES (
    v_tenant_id,
    p_customer_id,
    p_property_id,
    p_service_id,
    (v_override_result->>'override_service_id')::UUID,
    p_frequency,
    p_start_date,
    p_end_date,
    COALESCE(p_preferred_day_of_week, EXTRACT(DOW FROM p_start_date)::INTEGER),
    p_preferred_time_window,
    'active',
    p_start_date,
    p_notes
  )
  RETURNING id INTO v_series_id;

  -- Generate first occurrence if requested
  IF p_generate_first_occurrence THEN
    -- Create first booking with override service
    INSERT INTO bookings (
      tenant_id,
      customer_id,
      property_id,
      service_id,
      recurring_series_id,
      is_first_occurrence_override,
      status,
      frequency,
      scheduled_date,
      scheduled_time_window
    ) VALUES (
      v_tenant_id,
      p_customer_id,
      p_property_id,
      (v_override_result->>'override_service_id')::UUID,  -- Use override for first
      v_series_id,
      TRUE,
      'confirmed',  -- Generated occurrences start as confirmed
      p_frequency,
      p_start_date,
      p_preferred_time_window
    )
    RETURNING id INTO v_first_booking_id;

    -- Calculate pricing for first booking
    v_pricing := calculate_booking_price(v_first_booking_id);

    IF (v_pricing->>'success')::BOOLEAN THEN
      UPDATE bookings
      SET
        pricing_snapshot = v_pricing->'breakdown',
        total_price_cents = (v_pricing->>'total_cents')::INTEGER
      WHERE id = v_first_booking_id;
    END IF;

    -- Update series with last generated date
    UPDATE recurring_series
    SET
      last_generated_date = p_start_date,
      next_occurrence_date = calculate_next_occurrence_date(v_series_id, p_start_date)
    WHERE id = v_series_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'series_id', v_series_id,
    'first_booking_id', v_first_booking_id,
    'override_service', v_override_result->'override_service_name',
    'maintenance_service', v_override_result->'maintenance_service_name',
    'deep_clean_required', v_deep_clean_result->'required',
    'deep_clean_reasons', v_deep_clean_result->'reasons'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_recurring_series(UUID, UUID, UUID, booking_frequency_code, DATE, INTEGER, time_window_code, DATE, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- Calculate Next Occurrence Date
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_occurrence_date(
  p_series_id UUID,
  p_from_date DATE
)
RETURNS DATE AS $$
DECLARE
  v_series RECORD;
  v_next DATE;
BEGIN
  SELECT * INTO v_series
  FROM recurring_series
  WHERE id = p_series_id;

  IF v_series IS NULL THEN
    RETURN NULL;
  END IF;

  v_next := CASE v_series.frequency
    WHEN 'weekly' THEN p_from_date + INTERVAL '7 days'
    WHEN 'biweekly' THEN p_from_date + INTERVAL '14 days'
    WHEN 'monthly' THEN p_from_date + INTERVAL '1 month'
    WHEN 'custom' THEN p_from_date + (COALESCE(v_series.custom_interval_days, 7) || ' days')::INTERVAL
    ELSE NULL
  END;

  -- Check end date
  IF v_series.end_date IS NOT NULL AND v_next > v_series.end_date THEN
    RETURN NULL;
  END IF;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Generate Future Occurrences (for scheduled job)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_future_occurrences(p_series_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_series RECORD;
  v_tenant_id UUID;
  v_horizon_date DATE;
  v_current_date DATE;
  v_booking_id UUID;
  v_generated INTEGER := 0;
  v_pricing JSONB;
BEGIN
  v_tenant_id := get_active_tenant_id();

  FOR v_series IN
    SELECT * FROM recurring_series
    WHERE status = 'active'
    AND (p_series_id IS NULL OR id = p_series_id)
    AND (v_tenant_id IS NULL OR tenant_id = v_tenant_id)
  LOOP
    v_horizon_date := CURRENT_DATE + (v_series.horizon_weeks * 7);
    v_current_date := COALESCE(v_series.next_occurrence_date, v_series.start_date);

    WHILE v_current_date <= v_horizon_date AND (v_series.end_date IS NULL OR v_current_date <= v_series.end_date) LOOP
      -- Check if booking already exists for this date
      IF NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE recurring_series_id = v_series.id
        AND scheduled_date = v_current_date
      ) THEN
        -- Create booking (use maintenance service for non-first occurrences)
        INSERT INTO bookings (
          tenant_id,
          customer_id,
          property_id,
          service_id,
          recurring_series_id,
          is_first_occurrence_override,
          status,
          frequency,
          scheduled_date,
          scheduled_time_window
        ) VALUES (
          v_series.tenant_id,
          v_series.customer_id,
          v_series.property_id,
          v_series.service_id,  -- Maintenance service for subsequent
          v_series.id,
          FALSE,
          'confirmed',  -- Per spec: generated as confirmed
          v_series.frequency,
          v_current_date,
          v_series.preferred_time_window
        )
        RETURNING id INTO v_booking_id;

        -- Calculate pricing
        v_pricing := calculate_booking_price(v_booking_id);

        IF (v_pricing->>'success')::BOOLEAN THEN
          UPDATE bookings
          SET
            pricing_snapshot = v_pricing->'breakdown',
            total_price_cents = (v_pricing->>'total_cents')::INTEGER
          WHERE id = v_booking_id;
        END IF;

        v_generated := v_generated + 1;
      END IF;

      v_current_date := calculate_next_occurrence_date(v_series.id, v_current_date);

      IF v_current_date IS NULL THEN
        EXIT;
      END IF;
    END LOOP;

    -- Update series
    UPDATE recurring_series
    SET
      last_generated_date = v_horizon_date,
      next_occurrence_date = v_current_date
    WHERE id = v_series.id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'generated_count', v_generated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_future_occurrences(UUID) TO authenticated;

-- ============================================================================
-- Pause Series
-- Per Spec C.5
-- ============================================================================

CREATE OR REPLACE FUNCTION pause_series(
  p_series_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_series RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_series
  FROM recurring_series
  WHERE id = p_series_id AND tenant_id = v_tenant_id;

  IF v_series IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Series not found');
  END IF;

  IF v_series.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only pause active series');
  END IF;

  UPDATE recurring_series
  SET
    status = 'paused',
    paused_at = NOW(),
    pause_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_series_id;

  RETURN jsonb_build_object('success', true, 'series_id', p_series_id, 'status', 'paused');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION pause_series(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Resume Series
-- Per Spec C.5: Resume after long pause triggers deep clean check
-- ============================================================================

CREATE OR REPLACE FUNCTION resume_series(
  p_series_id UUID,
  p_resume_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_series RECORD;
  v_resume_date DATE;
  v_deep_clean_result JSONB;
  v_pause_days INTEGER;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_series
  FROM recurring_series
  WHERE id = p_series_id AND tenant_id = v_tenant_id;

  IF v_series IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Series not found');
  END IF;

  IF v_series.status != 'paused' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only resume paused series');
  END IF;

  v_resume_date := COALESCE(p_resume_date, CURRENT_DATE);

  -- Calculate pause duration
  v_pause_days := EXTRACT(DAY FROM NOW() - v_series.paused_at);

  -- Check deep clean requirement after pause
  v_deep_clean_result := evaluate_deep_clean_required(
    v_series.customer_id,
    v_series.property_id,
    v_series.service_id
  );

  -- Add pause-specific check
  IF v_pause_days >= 60 THEN  -- Long pause threshold
    v_deep_clean_result := jsonb_set(
      v_deep_clean_result,
      '{long_pause_warning}',
      to_jsonb(format('Series was paused for %s days. Consider requiring deep clean.', v_pause_days))
    );
  END IF;

  UPDATE recurring_series
  SET
    status = 'active',
    paused_at = NULL,
    pause_reason = NULL,
    next_occurrence_date = v_resume_date,
    updated_at = NOW()
  WHERE id = p_series_id;

  RETURN jsonb_build_object(
    'success', true,
    'series_id', p_series_id,
    'status', 'active',
    'resume_date', v_resume_date,
    'pause_duration_days', v_pause_days,
    'deep_clean_check', v_deep_clean_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resume_series(UUID, DATE) TO authenticated;

-- ============================================================================
-- Cancel Series
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_series(
  p_series_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_cancel_future_bookings BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_series RECORD;
  v_cancelled_bookings INTEGER := 0;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_series
  FROM recurring_series
  WHERE id = p_series_id AND tenant_id = v_tenant_id;

  IF v_series IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Series not found');
  END IF;

  IF v_series.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Series already cancelled');
  END IF;

  -- Cancel future bookings if requested
  IF p_cancel_future_bookings THEN
    UPDATE bookings
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = 'Series cancelled: ' || COALESCE(p_reason, 'No reason provided'),
      cancelled_by_id = auth.uid(),
      updated_at = NOW()
    WHERE recurring_series_id = p_series_id
    AND status IN ('confirmed', 'scheduled')
    AND scheduled_date >= CURRENT_DATE;

    GET DIAGNOSTICS v_cancelled_bookings = ROW_COUNT;
  END IF;

  UPDATE recurring_series
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_series_id;

  RETURN jsonb_build_object(
    'success', true,
    'series_id', p_series_id,
    'status', 'cancelled',
    'cancelled_future_bookings', v_cancelled_bookings
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_series(UUID, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION resolve_first_occurrence_override(UUID) IS
  'Resolves override service per C.3 precedence. BLOCKS if no override configured.';

COMMENT ON FUNCTION evaluate_deep_clean_required(UUID, UUID, UUID) IS
  'Computes deep clean requirement from history + policy. Per C.4.';

COMMENT ON FUNCTION create_recurring_series(UUID, UUID, UUID, booking_frequency_code, DATE, INTEGER, time_window_code, DATE, TEXT, BOOLEAN) IS
  'Creates recurring series with Option B model. First occurrence uses override service.';

COMMENT ON FUNCTION generate_future_occurrences(UUID) IS
  'Generates future bookings up to horizon. For scheduled job.';
