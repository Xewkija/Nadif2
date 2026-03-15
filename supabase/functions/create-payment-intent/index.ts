import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  bookingId: string
  amountCents: number
  paymentMethodId?: string
  transactionType?: 'charge' | 'deposit'
}

// Calculate platform application fee (2.5%, minimum $0.50)
function calculateApplicationFee(amountCents: number): number {
  const percentageFee = Math.round(amountCents * 0.025)
  return Math.max(percentageFee, 50)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const body: RequestBody = await req.json()
    const { bookingId, amountCents, paymentMethodId, transactionType = 'charge' } = body

    if (!bookingId || !amountCents) {
      return new Response(
        JSON.stringify({ error: 'bookingId and amountCents are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amountCents < 50) {
      return new Response(
        JSON.stringify({ error: 'Minimum charge amount is $0.50' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active workspace
    const { data: workspace, error: workspaceError } = await supabase.rpc('get_active_workspace')
    if (workspaceError || !workspace?.success) {
      return new Response(
        JSON.stringify({ error: 'No active workspace' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Stripe Connect status
    const { data: connectStatus } = await supabase.rpc('get_stripe_connect_status')
    if (!connectStatus?.account_id || !connectStatus?.charges_enabled) {
      return new Response(
        JSON.stringify({ error: 'Stripe payments not configured for this business' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get booking with customer
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        total_price_cents,
        amount_paid_cents,
        payment_status,
        customer:customers(id, stripe_customer_id, email, first_name, last_name)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const customer = booking.customer as { id: string; stripe_customer_id: string | null; email: string | null; first_name: string; last_name: string }

    if (!customer?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Customer has no payment method on file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get payment method if not specified
    let paymentMethod = paymentMethodId
    if (!paymentMethod) {
      const { data: defaultMethod } = await supabase
        .from('customer_payment_methods')
        .select('stripe_payment_method_id')
        .eq('customer_id', customer.id)
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (!defaultMethod?.stripe_payment_method_id) {
        return new Response(
          JSON.stringify({ error: 'No default payment method found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      paymentMethod = defaultMethod.stripe_payment_method_id
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Create PaymentIntent on connected account with direct charge
    const applicationFee = calculateApplicationFee(amountCents)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customer.stripe_customer_id,
      payment_method: paymentMethod,
      confirm: true, // Immediately attempt to charge
      off_session: true, // Customer not present
      application_fee_amount: applicationFee,
      metadata: {
        booking_id: bookingId,
        customer_id: customer.id,
        tenant_id: workspace.tenant_id,
        transaction_type: transactionType,
      },
    }, {
      stripeAccount: connectStatus.account_id,
    })

    // Record pending transaction (webhook will update on success/failure)
    await supabase.from('payment_transactions').insert({
      tenant_id: workspace.tenant_id,
      booking_id: bookingId,
      customer_id: customer.id,
      stripe_payment_intent_id: paymentIntent.id,
      transaction_type: transactionType,
      amount_cents: amountCents,
      status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
      ...(paymentIntent.status === 'succeeded' ? { completed_at: new Date().toISOString() } : {}),
    })

    // If immediately succeeded, update booking
    if (paymentIntent.status === 'succeeded') {
      const newAmountPaid = (booking.amount_paid_cents || 0) + amountCents
      const newStatus = newAmountPaid >= booking.total_price_cents
        ? 'fully_paid'
        : transactionType === 'deposit'
          ? 'deposit_paid'
          : 'deposit_paid'

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

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amountCharged: amountCents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Create payment intent error:', error)

    // Handle Stripe errors specifically
    if (error instanceof Stripe.errors.StripeError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          type: 'stripe_error',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create payment',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
