-- ============================================================================
-- Booking Lifecycle RPCs
-- Phase 1A: Database Foundation
-- Core RPCs for booking state machine per Spec B.1
-- ============================================================================

-- ============================================================================
-- Helper: Validate booking transition
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_booking_transition(
  p_current_status booking_status,
  p_new_status booking_status
)
RETURNS BOOLEAN AS $$
BEGIN
  -- State machine transitions per B.1
  RETURN CASE p_current_status
    WHEN 'draft' THEN p_new_status IN ('quote_pending', 'confirmed', 'cancelled')
    WHEN 'quote_pending' THEN p_new_status IN ('quote_accepted', 'quote_expired', 'quote_declined', 'cancelled')
    WHEN 'quote_accepted' THEN p_new_status IN ('confirmed', 'cancelled')
    WHEN 'quote_expired' THEN p_new_status = 'cancelled'
    WHEN 'quote_declined' THEN p_new_status = 'cancelled'
    WHEN 'confirmed' THEN p_new_status IN ('scheduled', 'cancelled', 'skipped')
    WHEN 'scheduled' THEN p_new_status IN ('in_progress', 'confirmed', 'cancelled', 'skipped')
    WHEN 'in_progress' THEN p_new_status IN ('completed', 'cancelled')
    WHEN 'completed' THEN FALSE -- Terminal
    WHEN 'cancelled' THEN FALSE -- Terminal
    WHEN 'skipped' THEN FALSE -- Terminal for this booking
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Create Draft Booking
-- ============================================================================

CREATE OR REPLACE FUNCTION create_draft_booking(
  p_customer_id UUID,
  p_property_id UUID,
  p_service_id UUID,
  p_frequency booking_frequency_code DEFAULT 'onetime',
  p_scheduled_date DATE DEFAULT NULL,
  p_scheduled_time_window time_window_code DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking_id UUID;
  v_service RECORD;
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

  -- Validate property belongs to customer
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = p_property_id AND customer_id = p_customer_id AND tenant_id = v_tenant_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Property not found');
  END IF;

  -- Get service and validate
  SELECT * INTO v_service
  FROM services
  WHERE id = p_service_id AND tenant_id = v_tenant_id AND is_active = TRUE;

  IF v_service IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- Create booking
  INSERT INTO bookings (
    tenant_id,
    customer_id,
    property_id,
    service_id,
    status,
    frequency,
    scheduled_date,
    scheduled_time_window,
    estimated_duration_minutes,
    customer_notes
  ) VALUES (
    v_tenant_id,
    p_customer_id,
    p_property_id,
    p_service_id,
    'draft',
    p_frequency,
    p_scheduled_date,
    p_scheduled_time_window,
    v_service.estimated_duration_minutes,
    p_customer_notes
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_draft_booking(UUID, UUID, UUID, booking_frequency_code, DATE, time_window_code, TEXT) TO authenticated;

-- ============================================================================
-- Update Draft Booking
-- ============================================================================

CREATE OR REPLACE FUNCTION update_draft_booking(
  p_booking_id UUID,
  p_updates JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  -- Get booking and validate ownership
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Only drafts can be freely edited
  IF v_booking.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only edit draft bookings');
  END IF;

  -- Apply updates
  UPDATE bookings
  SET
    service_id = COALESCE((p_updates->>'service_id')::UUID, service_id),
    scheduled_date = COALESCE((p_updates->>'scheduled_date')::DATE, scheduled_date),
    scheduled_time_window = COALESCE((p_updates->>'scheduled_time_window')::time_window_code, scheduled_time_window),
    scheduled_time_start = COALESCE((p_updates->>'scheduled_time_start')::TIME, scheduled_time_start),
    scheduled_time_end = COALESCE((p_updates->>'scheduled_time_end')::TIME, scheduled_time_end),
    customer_notes = COALESCE(p_updates->>'customer_notes', customer_notes),
    internal_notes = COALESCE(p_updates->>'internal_notes', internal_notes),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_draft_booking(UUID, JSONB) TO authenticated;

-- ============================================================================
-- Send Quote (draft -> quote_pending)
-- ============================================================================

CREATE OR REPLACE FUNCTION send_quote(
  p_booking_id UUID,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_pricing JSONB;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'quote_pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transition from ' || v_booking.status);
  END IF;

  -- Validate required fields
  IF v_booking.customer_id IS NULL OR v_booking.property_id IS NULL OR v_booking.service_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required booking fields');
  END IF;

  -- Calculate pricing (placeholder - will be implemented in pricing RPC)
  v_pricing := calculate_booking_price(p_booking_id);

  IF NOT (v_pricing->>'success')::BOOLEAN THEN
    RETURN v_pricing;
  END IF;

  -- Update booking
  UPDATE bookings
  SET
    status = 'quote_pending',
    pricing_snapshot = v_pricing->'breakdown',
    total_price_cents = (v_pricing->>'total_cents')::INTEGER,
    quote_sent_at = NOW(),
    quote_expires_at = NOW() + (p_expires_in_days || ' days')::INTERVAL,
    quote_version = COALESCE(quote_version, 0) + 1,
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', 'quote_pending',
    'expires_at', NOW() + (p_expires_in_days || ' days')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_quote(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- Accept Quote by Staff (quote_pending -> quote_accepted)
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_quote_by_staff(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'quote_accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transition from ' || v_booking.status);
  END IF;

  UPDATE bookings
  SET
    status = 'quote_accepted',
    quote_accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', 'quote_accepted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_quote_by_staff(UUID) TO authenticated;

-- ============================================================================
-- Confirm Booking (quote_accepted -> confirmed OR draft -> confirmed)
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_booking(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_pricing JSONB;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transition from ' || v_booking.status);
  END IF;

  -- If coming from draft (skip quote), calculate and lock pricing now
  IF v_booking.status = 'draft' THEN
    v_pricing := calculate_booking_price(p_booking_id);

    IF NOT (v_pricing->>'success')::BOOLEAN THEN
      RETURN v_pricing;
    END IF;

    UPDATE bookings
    SET
      pricing_snapshot = v_pricing->'breakdown',
      total_price_cents = (v_pricing->>'total_cents')::INTEGER
    WHERE id = p_booking_id;
  END IF;

  -- Validate required fields
  IF v_booking.scheduled_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Scheduled date required');
  END IF;

  UPDATE bookings
  SET
    status = 'confirmed',
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', 'confirmed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION confirm_booking(UUID) TO authenticated;

-- ============================================================================
-- Assign Provider (confirmed -> scheduled)
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_provider(
  p_booking_id UUID,
  p_provider_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Validate provider exists and is member of tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE user_id = p_provider_id AND tenant_id = v_tenant_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found in workspace');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'scheduled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transition from ' || v_booking.status);
  END IF;

  UPDATE bookings
  SET
    status = 'scheduled',
    assigned_provider_id = p_provider_id,
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', 'scheduled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION assign_provider(UUID, UUID) TO authenticated;

-- ============================================================================
-- Unassign Provider (scheduled -> confirmed)
-- ============================================================================

CREATE OR REPLACE FUNCTION unassign_provider(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transition from ' || v_booking.status);
  END IF;

  UPDATE bookings
  SET
    status = 'confirmed',
    assigned_provider_id = NULL,
    assigned_at = NULL,
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', 'confirmed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unassign_provider(UUID) TO authenticated;

-- ============================================================================
-- Provider Check In (scheduled -> in_progress)
-- ============================================================================

CREATE OR REPLACE FUNCTION provider_check_in(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transition from ' || v_booking.status);
  END IF;

  -- Verify caller is the assigned provider or has manager access
  IF v_booking.assigned_provider_id != auth.uid() AND NOT user_has_manager_access() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE bookings
  SET
    status = 'in_progress',
    check_in_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', 'in_progress');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION provider_check_in(UUID) TO authenticated;

-- ============================================================================
-- Provider Check Out (in_progress -> completed)
-- ============================================================================

CREATE OR REPLACE FUNCTION provider_check_out(
  p_booking_id UUID,
  p_completion_notes TEXT DEFAULT NULL,
  p_completion_photos TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_duration INTEGER;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transition from ' || v_booking.status);
  END IF;

  -- Verify caller is the assigned provider or has manager access
  IF v_booking.assigned_provider_id != auth.uid() AND NOT user_has_manager_access() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Calculate actual duration
  v_duration := EXTRACT(EPOCH FROM (NOW() - v_booking.check_in_at)) / 60;

  UPDATE bookings
  SET
    status = 'completed',
    check_out_at = NOW(),
    actual_duration_minutes = v_duration,
    completion_notes = p_completion_notes,
    completion_photos = p_completion_photos,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Record in service history for deep clean tracking
  INSERT INTO customer_property_service_history (
    tenant_id,
    customer_id,
    property_id,
    service_id,
    booking_id,
    completed_at,
    service_type,
    was_deep_clean
  )
  SELECT
    v_booking.tenant_id,
    v_booking.customer_id,
    v_booking.property_id,
    v_booking.service_id,
    v_booking.id,
    NOW(),
    s.service_type,
    s.service_type = 'deep'
  FROM services s
  WHERE s.id = v_booking.service_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION provider_check_out(UUID, TEXT, TEXT[]) TO authenticated;

-- ============================================================================
-- Cancel Booking
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel booking in ' || v_booking.status || ' status');
  END IF;

  UPDATE bookings
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason,
    cancelled_by_id = auth.uid(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_booking(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Skip Occurrence (for recurring bookings - confirmed/scheduled -> skipped)
-- Per Spec C.5: skip is a booking status, series continues
-- ============================================================================

CREATE OR REPLACE FUNCTION skip_occurrence(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Skip only applies to recurring bookings
  IF v_booking.recurring_series_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Skip only applies to recurring bookings');
  END IF;

  IF NOT validate_booking_transition(v_booking.status, 'skipped') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot skip booking in ' || v_booking.status || ' status');
  END IF;

  UPDATE bookings
  SET
    status = 'skipped',
    cancellation_reason = p_reason, -- Using same field for skip reason
    cancelled_by_id = auth.uid(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Series continues - skipped booking remains linked but doesn't affect future generation

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', 'skipped');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION skip_occurrence(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Reopen as Draft (cancelled/expired/declined -> new draft)
-- ============================================================================

CREATE OR REPLACE FUNCTION reopen_as_draft(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_new_booking_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status NOT IN ('cancelled', 'quote_expired', 'quote_declined') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only reopen cancelled, expired, or declined bookings');
  END IF;

  -- Create new draft based on original
  INSERT INTO bookings (
    tenant_id,
    customer_id,
    property_id,
    service_id,
    status,
    frequency,
    scheduled_date,
    scheduled_time_window,
    scheduled_time_start,
    scheduled_time_end,
    estimated_duration_minutes,
    customer_notes,
    internal_notes
  )
  SELECT
    tenant_id,
    customer_id,
    property_id,
    service_id,
    'draft',
    frequency,
    scheduled_date,
    scheduled_time_window,
    scheduled_time_start,
    scheduled_time_end,
    estimated_duration_minutes,
    customer_notes,
    internal_notes
  FROM bookings
  WHERE id = p_booking_id
  RETURNING id INTO v_new_booking_id;

  -- Copy add-ons
  INSERT INTO booking_add_ons (booking_id, add_on_id, quantity, price_cents)
  SELECT v_new_booking_id, add_on_id, quantity, price_cents
  FROM booking_add_ons
  WHERE booking_id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'original_booking_id', p_booking_id,
    'new_booking_id', v_new_booking_id,
    'status', 'draft'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reopen_as_draft(UUID) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION validate_booking_transition(booking_status, booking_status) IS
  'Validates state machine transitions per Spec B.1';

COMMENT ON FUNCTION skip_occurrence(UUID, TEXT) IS
  'Skip a recurring occurrence. Per Spec C.5, skipped is a booking status, series continues.';
