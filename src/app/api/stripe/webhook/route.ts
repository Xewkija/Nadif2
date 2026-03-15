import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getStripeServer, verifyWebhookSignature } from '@/lib/stripe/server'
import type Stripe from 'stripe'

// Use service role client for webhook operations (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient(supabaseUrl, serviceKey)
}

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe Connect webhook events.
 * Events include account.updated, payment_intent.succeeded, etc.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = verifyWebhookSignature(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()

  // Check for duplicate event (idempotency)
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .single()

  if (existingEvent) {
    // Already processed, return success
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Get connected account ID from event (for Connect events)
  const connectedAccountId = event.account

  // Resolve tenant from connected account
  let tenantId: string | null = null

  if (connectedAccountId) {
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('tenant_id')
      .eq('stripe_account_id', connectedAccountId)
      .single()

    tenantId = settings?.tenant_id || null

    if (!tenantId) {
      console.warn(`Webhook for unknown connected account: ${connectedAccountId}`)
      // Still acknowledge receipt to prevent retries
      return NextResponse.json({ received: true, warning: 'Unknown account' })
    }
  }

  // Record event before processing
  await supabase
    .from('stripe_webhook_events')
    .insert({
      id: event.id,
      tenant_id: tenantId,
      event_type: event.type,
    })

  // Handle specific event types
  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(supabase, event.data.object as Stripe.Account)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          supabase,
          event.data.object as Stripe.PaymentIntent,
          tenantId
        )
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(
          supabase,
          event.data.object as Stripe.PaymentIntent,
          tenantId
        )
        break

      case 'charge.refunded':
        await handleChargeRefunded(
          supabase,
          event.data.object as Stripe.Charge,
          tenantId
        )
        break

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(
          supabase,
          event.data.object as Stripe.SetupIntent,
          tenantId
        )
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Error handling ${event.type}:`, error)
    // Return 200 to prevent retries, but log the error
    return NextResponse.json({
      received: true,
      error: error instanceof Error ? error.message : 'Handler error',
    })
  }
}

/**
 * Handle account.updated event
 * Updates tenant's Stripe account status
 */
async function handleAccountUpdated(
  supabase: ReturnType<typeof getServiceClient>,
  account: Stripe.Account
) {
  const requirementsDue = account.requirements?.currently_due || []

  // Update tenant settings via RPC
  const { data, error } = await supabase.rpc('update_stripe_account_status', {
    p_stripe_account_id: account.id,
    p_charges_enabled: account.charges_enabled,
    p_payouts_enabled: account.payouts_enabled,
    p_requirements_due: requirementsDue.length > 0 ? requirementsDue : null,
  })

  if (error) {
    console.error('Failed to update account status:', error)
    throw error
  }

  console.log(`Account ${account.id} updated: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`)
}

/**
 * Handle payment_intent.succeeded event
 * Records successful transaction and updates booking status
 */
async function handlePaymentIntentSucceeded(
  supabase: ReturnType<typeof getServiceClient>,
  paymentIntent: Stripe.PaymentIntent,
  tenantId: string | null
) {
  if (!tenantId) {
    console.warn('Payment succeeded for unknown tenant')
    return
  }

  const bookingId = paymentIntent.metadata?.booking_id
  if (!bookingId) {
    console.log('Payment without booking_id metadata, skipping')
    return
  }

  const transactionType = paymentIntent.metadata?.transaction_type || 'charge'
  const chargeId = paymentIntent.latest_charge as string | undefined

  // Record transaction
  await supabase.from('payment_transactions').insert({
    tenant_id: tenantId,
    booking_id: bookingId,
    customer_id: paymentIntent.metadata?.customer_id,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_charge_id: chargeId,
    transaction_type: transactionType,
    amount_cents: paymentIntent.amount,
    status: 'succeeded',
    completed_at: new Date().toISOString(),
  })

  // Update booking payment status
  const { data: booking } = await supabase
    .from('bookings')
    .select('total_price_cents, amount_paid_cents')
    .eq('id', bookingId)
    .single()

  if (booking) {
    const newAmountPaid = (booking.amount_paid_cents || 0) + paymentIntent.amount
    const newStatus = newAmountPaid >= booking.total_price_cents
      ? 'fully_paid'
      : transactionType === 'deposit'
        ? 'deposit_paid'
        : 'deposit_paid' // Partial payment

    await supabase
      .from('bookings')
      .update({
        amount_paid_cents: newAmountPaid,
        payment_status: newStatus,
        stripe_payment_intent_id: paymentIntent.id,
        ...(transactionType === 'deposit' ? { deposit_paid: true } : {}),
      })
      .eq('id', bookingId)
  }

  console.log(`Payment ${paymentIntent.id} succeeded for booking ${bookingId}`)
}

/**
 * Handle payment_intent.payment_failed event
 * Records failed transaction
 */
async function handlePaymentIntentFailed(
  supabase: ReturnType<typeof getServiceClient>,
  paymentIntent: Stripe.PaymentIntent,
  tenantId: string | null
) {
  if (!tenantId) {
    console.warn('Payment failed for unknown tenant')
    return
  }

  const bookingId = paymentIntent.metadata?.booking_id
  if (!bookingId) {
    console.log('Failed payment without booking_id metadata, skipping')
    return
  }

  const lastError = paymentIntent.last_payment_error
  const failureReason = lastError?.message || 'Payment failed'

  // Record failed transaction
  await supabase.from('payment_transactions').insert({
    tenant_id: tenantId,
    booking_id: bookingId,
    customer_id: paymentIntent.metadata?.customer_id,
    stripe_payment_intent_id: paymentIntent.id,
    transaction_type: paymentIntent.metadata?.transaction_type || 'charge',
    amount_cents: paymentIntent.amount,
    status: 'failed',
    failure_reason: failureReason,
    metadata: {
      error_code: lastError?.code,
      error_type: lastError?.type,
    },
  })

  // Update booking payment status
  await supabase
    .from('bookings')
    .update({ payment_status: 'payment_failed' })
    .eq('id', bookingId)

  console.log(`Payment ${paymentIntent.id} failed for booking ${bookingId}: ${failureReason}`)
}

/**
 * Handle charge.refunded event
 * Records refund transaction and updates booking status
 */
async function handleChargeRefunded(
  supabase: ReturnType<typeof getServiceClient>,
  charge: Stripe.Charge,
  tenantId: string | null
) {
  if (!tenantId) {
    console.warn('Refund for unknown tenant')
    return
  }

  const bookingId = charge.metadata?.booking_id
  if (!bookingId) {
    console.log('Refund without booking_id metadata, skipping')
    return
  }

  // Get refund amount from the charge
  const refundAmount = charge.amount_refunded

  // Record refund transaction
  await supabase.from('payment_transactions').insert({
    tenant_id: tenantId,
    booking_id: bookingId,
    customer_id: charge.metadata?.customer_id,
    stripe_charge_id: charge.id,
    stripe_refund_id: charge.refunds?.data?.[0]?.id,
    transaction_type: 'refund',
    amount_cents: refundAmount,
    status: 'succeeded',
    completed_at: new Date().toISOString(),
  })

  // Update booking payment status
  const { data: booking } = await supabase
    .from('bookings')
    .select('amount_paid_cents')
    .eq('id', bookingId)
    .single()

  if (booking) {
    const newAmountPaid = Math.max(0, (booking.amount_paid_cents || 0) - refundAmount)
    const newStatus = newAmountPaid <= 0 ? 'refunded' : 'partially_refunded'

    await supabase
      .from('bookings')
      .update({
        amount_paid_cents: newAmountPaid,
        payment_status: newStatus,
      })
      .eq('id', bookingId)
  }

  console.log(`Charge ${charge.id} refunded for booking ${bookingId}`)
}

/**
 * Handle setup_intent.succeeded event
 * Saves payment method to customer
 */
async function handleSetupIntentSucceeded(
  supabase: ReturnType<typeof getServiceClient>,
  setupIntent: Stripe.SetupIntent,
  tenantId: string | null
) {
  if (!tenantId) {
    console.warn('SetupIntent succeeded for unknown tenant')
    return
  }

  const customerId = setupIntent.metadata?.nadif_customer_id
  const stripeCustomerId = setupIntent.customer as string

  if (!customerId || !stripeCustomerId) {
    console.log('SetupIntent without customer metadata, skipping')
    return
  }

  const paymentMethodId = setupIntent.payment_method as string
  if (!paymentMethodId) {
    console.log('SetupIntent without payment method, skipping')
    return
  }

  // Fetch payment method details from Stripe
  const stripe = getStripeServer()
  // Use the connected account to retrieve the payment method
  const connectedAccountId = await getConnectedAccountForTenant(supabase, tenantId)

  if (!connectedAccountId) {
    console.error('No connected account found for tenant')
    return
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(
    paymentMethodId,
    { stripeAccount: connectedAccountId }
  )

  if (paymentMethod.type !== 'card' || !paymentMethod.card) {
    console.log('Non-card payment method, skipping')
    return
  }

  // Check if this payment method already exists
  const { data: existing } = await supabase
    .from('customer_payment_methods')
    .select('id')
    .eq('stripe_payment_method_id', paymentMethodId)
    .single()

  if (existing) {
    console.log('Payment method already saved, skipping')
    return
  }

  // If this will be default, unset other defaults
  const setAsDefault = setupIntent.metadata?.set_as_default !== 'false'

  if (setAsDefault) {
    await supabase
      .from('customer_payment_methods')
      .update({ is_default: false })
      .eq('customer_id', customerId)
      .eq('is_default', true)
  }

  // Insert payment method
  await supabase.from('customer_payment_methods').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    stripe_payment_method_id: paymentMethodId,
    stripe_customer_id: stripeCustomerId,
    card_brand: paymentMethod.card.brand,
    card_last_four: paymentMethod.card.last4,
    card_exp_month: paymentMethod.card.exp_month,
    card_exp_year: paymentMethod.card.exp_year,
    is_default: setAsDefault,
  })

  // Update customer's stripe_customer_id if not set
  await supabase
    .from('customers')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', customerId)
    .is('stripe_customer_id', null)

  console.log(`Payment method ${paymentMethodId} saved for customer ${customerId}`)
}

/**
 * Helper to get connected account ID for a tenant
 */
async function getConnectedAccountForTenant(
  supabase: ReturnType<typeof getServiceClient>,
  tenantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('stripe_account_id')
    .eq('tenant_id', tenantId)
    .single()

  return data?.stripe_account_id || null
}
