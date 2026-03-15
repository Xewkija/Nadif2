-- ============================================================================
-- Payment System Migration
-- Phase 1G: Payment Integration
-- ============================================================================

-- ============================================================================
-- Customer Payment Methods
-- ============================================================================

CREATE TABLE customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Stripe identifiers
  stripe_payment_method_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,

  -- Card details (non-sensitive, for display)
  card_brand TEXT NOT NULL, -- visa, mastercard, amex, etc.
  card_last_four TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,

  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_payment_methods_tenant ON customer_payment_methods(tenant_id);
CREATE INDEX idx_customer_payment_methods_customer ON customer_payment_methods(customer_id);
CREATE INDEX idx_customer_payment_methods_stripe ON customer_payment_methods(stripe_payment_method_id);

-- Ensure only one default per customer
CREATE UNIQUE INDEX idx_customer_payment_methods_default
  ON customer_payment_methods(customer_id)
  WHERE is_default = TRUE AND is_active = TRUE;

-- ============================================================================
-- Payment Transactions (audit trail)
-- ============================================================================

CREATE TYPE payment_transaction_type AS ENUM (
  'charge',
  'deposit',
  'refund',
  'void'
);

CREATE TYPE payment_transaction_status AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Stripe identifiers
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,

  -- Transaction details
  transaction_type payment_transaction_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  status payment_transaction_status NOT NULL DEFAULT 'pending',

  -- Metadata
  description TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX idx_payment_transactions_booking ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_customer ON payment_transactions(customer_id);
CREATE INDEX idx_payment_transactions_stripe_pi ON payment_transactions(stripe_payment_intent_id);

-- ============================================================================
-- Add Stripe customer ID to customers table
-- ============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_stripe ON customers(stripe_customer_id);

-- ============================================================================
-- Add payment fields to bookings
-- ============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid', 'refunded', 'partially_refunded'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER DEFAULT 0;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON customer_payment_methods
  FOR ALL USING (tenant_id = get_active_tenant_id());

CREATE POLICY "tenant_isolation" ON payment_transactions
  FOR ALL USING (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Evaluate Payment Gate
-- Determines what payment requirements apply to a booking
-- ============================================================================

CREATE OR REPLACE FUNCTION evaluate_payment_gate(
  p_booking_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_service_id UUID DEFAULT NULL,
  p_amount_cents INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_settings RECORD;
  v_customer RECORD;
  v_service RECORD;
  v_booking RECORD;
  v_has_card BOOLEAN;
  v_policies RECORD;
  v_requirements JSONB;
  v_deposit_amount INTEGER;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Get tenant settings
  SELECT * INTO v_settings
  FROM tenant_settings
  WHERE tenant_id = v_tenant_id;

  -- Get booking if provided
  IF p_booking_id IS NOT NULL THEN
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id AND tenant_id = v_tenant_id;

    IF v_booking IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    p_customer_id := COALESCE(p_customer_id, v_booking.customer_id);
    p_service_id := COALESCE(p_service_id, v_booking.service_id);
    p_amount_cents := COALESCE(p_amount_cents, v_booking.total_price_cents);
  END IF;

  -- Get customer
  IF p_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer
    FROM customers
    WHERE id = p_customer_id AND tenant_id = v_tenant_id;
  END IF;

  -- Get service
  IF p_service_id IS NOT NULL THEN
    SELECT * INTO v_service
    FROM services
    WHERE id = p_service_id AND tenant_id = v_tenant_id;
  END IF;

  -- Check if customer has a card on file
  SELECT EXISTS (
    SELECT 1 FROM customer_payment_methods
    WHERE customer_id = p_customer_id
    AND tenant_id = v_tenant_id
    AND is_active = TRUE
  ) INTO v_has_card;

  -- Initialize requirements
  v_requirements := jsonb_build_object(
    'card_required', false,
    'card_required_reason', null,
    'deposit_required', false,
    'deposit_amount_cents', 0,
    'deposit_reason', null,
    'prepayment_required', false,
    'has_card_on_file', COALESCE(v_has_card, false)
  );

  -- Check global tenant settings
  IF v_settings.require_card_on_file THEN
    v_requirements := v_requirements || jsonb_build_object(
      'card_required', true,
      'card_required_reason', 'Tenant policy requires card on file'
    );
  END IF;

  IF v_settings.require_deposit AND p_amount_cents IS NOT NULL THEN
    v_deposit_amount := (p_amount_cents * COALESCE(v_settings.default_deposit_percentage, 0)) / 100;
    IF v_deposit_amount > 0 THEN
      v_requirements := v_requirements || jsonb_build_object(
        'deposit_required', true,
        'deposit_amount_cents', v_deposit_amount,
        'deposit_reason', 'Tenant policy requires deposit'
      );
    END IF;
  END IF;

  -- Check applicable payment gate policies (more specific rules)
  FOR v_policies IN
    SELECT * FROM payment_gate_policies
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE
    ORDER BY priority ASC
  LOOP
    -- Check if policy applies based on conditions
    DECLARE
      v_applies BOOLEAN := TRUE;
    BEGIN
      -- Check customer type condition
      IF v_policies.applies_to_customer_types IS NOT NULL AND v_customer IS NOT NULL THEN
        IF NOT (v_customer.customer_type = ANY(v_policies.applies_to_customer_types)) THEN
          v_applies := FALSE;
        END IF;
      END IF;

      -- Check service type condition
      IF v_policies.applies_to_service_types IS NOT NULL AND v_service IS NOT NULL THEN
        IF NOT (v_service.service_type = ANY(v_policies.applies_to_service_types)) THEN
          v_applies := FALSE;
        END IF;
      END IF;

      -- Check minimum amount condition
      IF v_policies.min_booking_amount_cents IS NOT NULL AND p_amount_cents IS NOT NULL THEN
        IF p_amount_cents < v_policies.min_booking_amount_cents THEN
          v_applies := FALSE;
        END IF;
      END IF;

      IF v_applies THEN
        -- Apply policy based on gate type
        IF v_policies.gate_type = 'require_card_before_quote' OR
           v_policies.gate_type = 'require_card_before_confirm' THEN
          v_requirements := v_requirements || jsonb_build_object(
            'card_required', true,
            'card_required_reason', COALESCE(v_policies.name, 'Payment policy')
          );
        END IF;

        IF v_policies.gate_type = 'require_deposit' THEN
          IF v_policies.deposit_flat_cents IS NOT NULL THEN
            v_deposit_amount := v_policies.deposit_flat_cents;
          ELSIF v_policies.deposit_percentage IS NOT NULL AND p_amount_cents IS NOT NULL THEN
            v_deposit_amount := (p_amount_cents * v_policies.deposit_percentage) / 100;
          ELSE
            v_deposit_amount := 0;
          END IF;

          IF v_deposit_amount > 0 THEN
            v_requirements := v_requirements || jsonb_build_object(
              'deposit_required', true,
              'deposit_amount_cents', v_deposit_amount,
              'deposit_reason', COALESCE(v_policies.name, 'Deposit policy')
            );
          END IF;
        END IF;

        IF v_policies.gate_type = 'require_prepayment' THEN
          v_requirements := v_requirements || jsonb_build_object(
            'prepayment_required', true,
            'card_required', true,
            'card_required_reason', COALESCE(v_policies.name, 'Prepayment required')
          );
        END IF;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'requirements', v_requirements
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create Stripe Setup Intent
-- Creates a setup intent for saving a card
-- ============================================================================

CREATE OR REPLACE FUNCTION create_payment_setup(
  p_customer_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_customer RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND tenant_id = v_tenant_id;

  IF v_customer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Return customer info - actual Stripe setup intent is created via Edge Function
  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'stripe_customer_id', v_customer.stripe_customer_id,
    'tenant_id', v_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Save Payment Method
-- Called after successful Stripe setup
-- ============================================================================

CREATE OR REPLACE FUNCTION save_payment_method(
  p_customer_id UUID,
  p_stripe_payment_method_id TEXT,
  p_stripe_customer_id TEXT,
  p_card_brand TEXT,
  p_card_last_four TEXT,
  p_card_exp_month INTEGER,
  p_card_exp_year INTEGER,
  p_set_as_default BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_payment_method_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Verify customer exists
  IF NOT EXISTS (
    SELECT 1 FROM customers
    WHERE id = p_customer_id AND tenant_id = v_tenant_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Update customer's Stripe ID if not set
  UPDATE customers
  SET stripe_customer_id = p_stripe_customer_id
  WHERE id = p_customer_id AND stripe_customer_id IS NULL;

  -- If setting as default, unset current default
  IF p_set_as_default THEN
    UPDATE customer_payment_methods
    SET is_default = FALSE
    WHERE customer_id = p_customer_id AND is_default = TRUE;
  END IF;

  -- Insert payment method
  INSERT INTO customer_payment_methods (
    tenant_id,
    customer_id,
    stripe_payment_method_id,
    stripe_customer_id,
    card_brand,
    card_last_four,
    card_exp_month,
    card_exp_year,
    is_default
  ) VALUES (
    v_tenant_id,
    p_customer_id,
    p_stripe_payment_method_id,
    p_stripe_customer_id,
    p_card_brand,
    p_card_last_four,
    p_card_exp_month,
    p_card_exp_year,
    p_set_as_default
  )
  RETURNING id INTO v_payment_method_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_method_id', v_payment_method_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Remove Payment Method
-- ============================================================================

CREATE OR REPLACE FUNCTION remove_payment_method(
  p_payment_method_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_method RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT * INTO v_method
  FROM customer_payment_methods
  WHERE id = p_payment_method_id AND tenant_id = v_tenant_id;

  IF v_method IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment method not found');
  END IF;

  -- Soft delete by marking inactive
  UPDATE customer_payment_methods
  SET is_active = FALSE, is_default = FALSE
  WHERE id = p_payment_method_id;

  -- If this was default, set another as default
  IF v_method.is_default THEN
    UPDATE customer_payment_methods
    SET is_default = TRUE
    WHERE id = (
      SELECT id FROM customer_payment_methods
      WHERE customer_id = v_method.customer_id
      AND is_active = TRUE
      AND id != p_payment_method_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'stripe_payment_method_id', v_method.stripe_payment_method_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Record Payment Transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION record_payment_transaction(
  p_booking_id UUID,
  p_transaction_type payment_transaction_type,
  p_amount_cents INTEGER,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_charge_id TEXT DEFAULT NULL,
  p_stripe_refund_id TEXT DEFAULT NULL,
  p_status payment_transaction_status DEFAULT 'pending',
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_transaction_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = v_tenant_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Create transaction record
  INSERT INTO payment_transactions (
    tenant_id,
    booking_id,
    customer_id,
    stripe_payment_intent_id,
    stripe_charge_id,
    stripe_refund_id,
    transaction_type,
    amount_cents,
    status,
    description,
    metadata,
    completed_at
  ) VALUES (
    v_tenant_id,
    p_booking_id,
    v_booking.customer_id,
    p_stripe_payment_intent_id,
    p_stripe_charge_id,
    p_stripe_refund_id,
    p_transaction_type,
    p_amount_cents,
    p_status,
    p_description,
    p_metadata,
    CASE WHEN p_status = 'succeeded' THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_transaction_id;

  -- Update booking payment status if transaction succeeded
  IF p_status = 'succeeded' THEN
    IF p_transaction_type = 'deposit' THEN
      UPDATE bookings
      SET
        deposit_paid = TRUE,
        payment_status = 'deposit_paid',
        amount_paid_cents = COALESCE(amount_paid_cents, 0) + p_amount_cents
      WHERE id = p_booking_id;
    ELSIF p_transaction_type = 'charge' THEN
      UPDATE bookings
      SET
        amount_paid_cents = COALESCE(amount_paid_cents, 0) + p_amount_cents,
        payment_status = CASE
          WHEN COALESCE(amount_paid_cents, 0) + p_amount_cents >= total_price_cents THEN 'fully_paid'
          ELSE 'deposit_paid'
        END
      WHERE id = p_booking_id;
    ELSIF p_transaction_type = 'refund' THEN
      UPDATE bookings
      SET
        amount_paid_cents = GREATEST(0, COALESCE(amount_paid_cents, 0) - p_amount_cents),
        payment_status = CASE
          WHEN COALESCE(amount_paid_cents, 0) - p_amount_cents <= 0 THEN 'refunded'
          ELSE 'partially_refunded'
        END
      WHERE id = p_booking_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create/Update Payment Gate Policy
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_payment_gate_policy(
  p_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_gate_type TEXT DEFAULT NULL,
  p_deposit_percentage INTEGER DEFAULT NULL,
  p_deposit_flat_cents INTEGER DEFAULT NULL,
  p_min_booking_amount_cents INTEGER DEFAULT NULL,
  p_applies_to_customer_types customer_type[] DEFAULT NULL,
  p_applies_to_service_types service_type_code[] DEFAULT NULL,
  p_priority INTEGER DEFAULT 0,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_policy_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE payment_gate_policies
    SET
      name = COALESCE(p_name, name),
      description = COALESCE(p_description, description),
      gate_type = COALESCE(p_gate_type, gate_type),
      deposit_percentage = p_deposit_percentage,
      deposit_flat_cents = p_deposit_flat_cents,
      min_booking_amount_cents = p_min_booking_amount_cents,
      applies_to_customer_types = p_applies_to_customer_types,
      applies_to_service_types = p_applies_to_service_types,
      priority = COALESCE(p_priority, priority),
      is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_id AND tenant_id = v_tenant_id
    RETURNING id INTO v_policy_id;

    IF v_policy_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Policy not found');
    END IF;
  ELSE
    -- Create new
    IF p_name IS NULL OR p_gate_type IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Name and gate_type are required');
    END IF;

    INSERT INTO payment_gate_policies (
      tenant_id,
      name,
      description,
      gate_type,
      deposit_percentage,
      deposit_flat_cents,
      min_booking_amount_cents,
      applies_to_customer_types,
      applies_to_service_types,
      priority,
      is_active
    ) VALUES (
      v_tenant_id,
      p_name,
      p_description,
      p_gate_type,
      p_deposit_percentage,
      p_deposit_flat_cents,
      p_min_booking_amount_cents,
      p_applies_to_customer_types,
      p_applies_to_service_types,
      p_priority,
      p_is_active
    )
    RETURNING id INTO v_policy_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'policy_id', v_policy_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Update Triggers
-- ============================================================================

CREATE TRIGGER update_customer_payment_methods_updated_at
  BEFORE UPDATE ON customer_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION evaluate_payment_gate(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_payment_setup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_payment_method(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_payment_method(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_payment_transaction(UUID, payment_transaction_type, INTEGER, TEXT, TEXT, TEXT, payment_transaction_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_payment_gate_policy(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, customer_type[], service_type_code[], INTEGER, BOOLEAN) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON customer_payment_methods TO authenticated;
GRANT SELECT, INSERT ON payment_transactions TO authenticated;
