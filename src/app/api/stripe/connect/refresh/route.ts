import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeServer } from '@/lib/stripe/server'

/**
 * POST /api/stripe/connect/refresh
 *
 * Creates a new Account Link for an existing connected account.
 * Used when the original link expires or user needs to complete onboarding.
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
    const workspaceResult = workspace as { success: boolean; tenant_id?: string } | null
    if (workspaceError || !workspaceResult?.success) {
      return NextResponse.json(
        { error: 'No active workspace' },
        { status: 400 }
      )
    }

    // Get current Stripe status
    const { data: connectStatus } = await (supabase.rpc as CallableFunction)('get_stripe_connect_status')
    const statusResult = connectStatus as { success: boolean; account_id?: string } | null

    if (!statusResult?.account_id) {
      return NextResponse.json(
        { error: 'No Stripe account connected' },
        { status: 400 }
      )
    }

    const stripe = getStripeServer()

    // Create new Account Link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: statusResult.account_id,
      type: 'account_onboarding',
      return_url: `${baseUrl}/app/settings/payments?stripe_connect=complete`,
      refresh_url: `${baseUrl}/app/settings/payments?stripe_connect=refresh`,
    })

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
    })
  } catch (error) {
    console.error('Stripe connect refresh error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create onboarding link' },
      { status: 500 }
    )
  }
}
