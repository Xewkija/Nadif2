-- ============================================================================
-- Stripe Connect Migration
-- Phase 1G: Payment Integration - Stripe Connect Support
-- ============================================================================

-- ============================================================================
-- Add Stripe Connect columns to tenant_settings
-- ============================================================================

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected'
    CHECK (stripe_account_status IN (
      'not_connected',
      'onboarding_started',
      'onboarding_incomplete',
      'restricted',
      'active'
    )),
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_requirements_due JSONB,
  ADD COLUMN IF NOT EXISTS stripe_account_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenant_settings_stripe
  ON tenant_settings(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- ============================================================================
-- Webhook idempotency table
-- Prevents duplicate processing of Stripe webhook events
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_tenant
  ON stripe_webhook_events(tenant_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON stripe_webhook_events(event_type);

-- ============================================================================
-- Add 'payment_failed' to payment_status CHECK constraint on bookings
-- Note: PostgreSQL doesn't allow direct ALTER of CHECK constraints,
-- so we drop and recreate
-- ============================================================================

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN (
    'unpaid',
    'deposit_paid',
    'fully_paid',
    'refunded',
    'partially_refunded',
    'payment_failed'
  ));

-- ============================================================================
-- RLS Policies for stripe_webhook_events
-- ============================================================================

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (webhooks run as service role)
CREATE POLICY "service_role_full_access" ON stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can only see their tenant's events
CREATE POLICY "tenant_read" ON stripe_webhook_events
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_active_tenant_id());

-- ============================================================================
-- Helper function to get Stripe account status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stripe_connect_status()
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_settings RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT
    stripe_account_id,
    stripe_account_status,
    stripe_charges_enabled,
    stripe_payouts_enabled,
    stripe_requirements_due,
    stripe_account_created_at
  INTO v_settings
  FROM tenant_settings
  WHERE tenant_id = v_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_settings.stripe_account_id,
    'status', COALESCE(v_settings.stripe_account_status, 'not_connected'),
    'charges_enabled', COALESCE(v_settings.stripe_charges_enabled, false),
    'payouts_enabled', COALESCE(v_settings.stripe_payouts_enabled, false),
    'requirements_due', v_settings.stripe_requirements_due,
    'created_at', v_settings.stripe_account_created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to update Stripe account status (called by webhook)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stripe_account_status(
  p_stripe_account_id TEXT,
  p_charges_enabled BOOLEAN,
  p_payouts_enabled BOOLEAN,
  p_requirements_due JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_new_status TEXT;
BEGIN
  -- Find tenant by stripe account ID
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_settings
  WHERE stripe_account_id = p_stripe_account_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stripe account not found');
  END IF;

  -- Determine status based on capabilities
  IF p_charges_enabled AND p_payouts_enabled THEN
    v_new_status := 'active';
  ELSIF p_charges_enabled THEN
    v_new_status := 'active'; -- Can charge even without payouts
  ELSIF p_requirements_due IS NOT NULL AND jsonb_array_length(p_requirements_due) > 0 THEN
    v_new_status := 'onboarding_incomplete';
  ELSE
    v_new_status := 'restricted';
  END IF;

  UPDATE tenant_settings
  SET
    stripe_account_status = v_new_status,
    stripe_charges_enabled = p_charges_enabled,
    stripe_payouts_enabled = p_payouts_enabled,
    stripe_requirements_due = p_requirements_due
  WHERE stripe_account_id = p_stripe_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'new_status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to save Stripe account ID (called after account creation)
-- ============================================================================

CREATE OR REPLACE FUNCTION save_stripe_account(
  p_stripe_account_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Check if already connected
  IF EXISTS (
    SELECT 1 FROM tenant_settings
    WHERE tenant_id = v_tenant_id
    AND stripe_account_id IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already connected to Stripe');
  END IF;

  UPDATE tenant_settings
  SET
    stripe_account_id = p_stripe_account_id,
    stripe_account_status = 'onboarding_started',
    stripe_account_created_at = NOW()
  WHERE tenant_id = v_tenant_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to get payment transactions for a booking
-- ============================================================================

CREATE OR REPLACE FUNCTION get_booking_transactions(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_transactions JSONB;
BEGIN
  v_tenant_id := get_active_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pt.id,
      'transaction_type', pt.transaction_type,
      'amount_cents', pt.amount_cents,
      'status', pt.status,
      'description', pt.description,
      'failure_reason', pt.failure_reason,
      'stripe_payment_intent_id', pt.stripe_payment_intent_id,
      'stripe_charge_id', pt.stripe_charge_id,
      'stripe_refund_id', pt.stripe_refund_id,
      'created_at', pt.created_at,
      'completed_at', pt.completed_at
    ) ORDER BY pt.created_at DESC
  )
  INTO v_transactions
  FROM payment_transactions pt
  WHERE pt.booking_id = p_booking_id
  AND pt.tenant_id = v_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'transactions', COALESCE(v_transactions, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_stripe_connect_status() TO authenticated;
GRANT EXECUTE ON FUNCTION save_stripe_account(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_transactions(UUID) TO authenticated;

-- Service role only for webhook functions
GRANT EXECUTE ON FUNCTION update_stripe_account_status(TEXT, BOOLEAN, BOOLEAN, JSONB) TO service_role;

GRANT SELECT ON stripe_webhook_events TO authenticated;
GRANT ALL ON stripe_webhook_events TO service_role;
