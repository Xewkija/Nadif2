import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  customerId: string
  setAsDefault?: boolean
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
    const { customerId, setAsDefault = true } = body

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customerId is required' }),
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

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, stripe_customer_id')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Stripe for the connected account
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

    // Create or retrieve Stripe customer on connected account
    let stripeCustomerId = customer.stripe_customer_id

    if (!stripeCustomerId) {
      // Create customer on connected account
      const stripeCustomer = await stripe.customers.create({
        email: customer.email || undefined,
        name: `${customer.first_name} ${customer.last_name}`.trim() || undefined,
        metadata: {
          nadif_customer_id: customer.id,
          tenant_id: workspace.tenant_id,
        },
      }, {
        stripeAccount: connectStatus.account_id,
      })

      stripeCustomerId = stripeCustomer.id

      // Save Stripe customer ID
      await supabase
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customerId)
    }

    // Create SetupIntent on connected account
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        nadif_customer_id: customerId,
        tenant_id: workspace.tenant_id,
        set_as_default: setAsDefault ? 'true' : 'false',
      },
    }, {
      stripeAccount: connectStatus.account_id,
    })

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: setupIntent.client_secret,
        stripeCustomerId,
        connectedAccountId: connectStatus.account_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Create setup intent error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create setup intent',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
