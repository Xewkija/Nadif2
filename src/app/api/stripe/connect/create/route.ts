import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeServer } from '@/lib/stripe/server'

/**
 * POST /api/stripe/connect/create
 *
 * Creates a new Stripe Standard connected account and returns an Account Link
 * for onboarding. The account is tied to the current tenant.
 */
export async function POST() {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get active workspace
    const { data: workspace, error: workspaceError } = await supabase.rpc('get_active_workspace')
    const workspaceResult = workspace as { success: boolean; tenant_id?: string; error?: string } | null
    if (workspaceError || !workspaceResult?.success) {
      return NextResponse.json(
        { error: 'No active workspace' },
        { status: 400 }
      )
    }

    // Check if tenant already has a Stripe account
    const { data: connectStatus } = await (supabase.rpc as CallableFunction)('get_stripe_connect_status')
    const connectResult = connectStatus as { success: boolean; account_id?: string } | null
    if (connectResult?.account_id) {
      return NextResponse.json(
        { error: 'Stripe account already connected' },
        { status: 400 }
      )
    }

    // Get tenant info for account creation
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('id', workspaceResult.tenant_id!)
      .single()

    const stripe = getStripeServer()

    // Create Standard connected account
    const account = await stripe.accounts.create({
      type: 'standard',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        tenant_id: workspaceResult.tenant_id!,
        tenant_name: tenant?.name || '',
      },
    })

    // Save account ID to tenant settings
    const { data: saveResult, error: saveError } = await (supabase.rpc as CallableFunction)('save_stripe_account', {
      p_stripe_account_id: account.id,
    })
    const saveResultData = saveResult as { success: boolean; error?: string } | null

    if (saveError || !saveResultData?.success) {
      // If we failed to save, delete the Stripe account to avoid orphans
      await stripe.accounts.del(account.id)
      return NextResponse.json(
        { error: saveError?.message || saveResultData?.error || 'Failed to save Stripe account' },
        { status: 500 }
      )
    }

    // Create Account Link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      return_url: `${baseUrl}/app/settings/payments?stripe_connect=complete`,
      refresh_url: `${baseUrl}/app/settings/payments?stripe_connect=refresh`,
    })

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
    })
  } catch (error) {
    console.error('Stripe connect create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Stripe account' },
      { status: 500 }
    )
  }
}
