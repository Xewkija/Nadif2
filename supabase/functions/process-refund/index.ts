import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  bookingId: string
  amountCents?: number // If not specified, full refund
  reason?: string
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
    const { bookingId, amountCents, reason } = body

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: 'bookingId is required' }),
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
    if (!connectStatus?.account_id) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured for this business' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, amount_paid_cents, stripe_payment_intent_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!booking.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'No payment found to refund' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if ((booking.amount_paid_cents || 0) <= 0) {
      return new Response(
        JSON.stringify({ error: 'No payments to refund' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine refund amount
    const maxRefund = booking.amount_paid_cents || 0
    const refundAmount = amountCents ? Math.min(amountCents, maxRefund) : maxRefund

    if (refundAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid refund amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    // Create refund on connected account
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        booking_id: bookingId,
        tenant_id: workspace.tenant_id,
        refund_reason: reason || 'Staff initiated refund',
      },
    }, {
      stripeAccount: connectStatus.account_id,
    })

    // Record refund transaction
    await supabase.from('payment_transactions').insert({
      tenant_id: workspace.tenant_id,
      booking_id: bookingId,
      customer_id: booking.customer_id,
      stripe_refund_id: refund.id,
      stripe_payment_intent_id: booking.stripe_payment_intent_id,
      transaction_type: 'refund',
      amount_cents: refundAmount,
      status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
      description: reason || 'Refund',
      ...(refund.status === 'succeeded' ? { completed_at: new Date().toISOString() } : {}),
    })

    // Update booking payment status
    if (refund.status === 'succeeded') {
      const newAmountPaid = Math.max(0, maxRefund - refundAmount)
      const newStatus = newAmountPaid <= 0 ? 'refunded' : 'partially_refunded'

      await supabase
        .from('bookings')
        .update({
          amount_paid_cents: newAmountPaid,
          payment_status: newStatus,
        })
        .eq('id', bookingId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        status: refund.status,
        amountRefunded: refundAmount,
        isPartialRefund: refundAmount < maxRefund,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process refund error:', error)

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
        error: error instanceof Error ? error.message : 'Failed to process refund',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
