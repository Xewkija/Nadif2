import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeServer } from '@/lib/stripe/server'

/**
 * GET /api/stripe/connect/status
 *
 * Gets the current Stripe Connect status for the tenant.
 * Fetches live data from Stripe and syncs to database.
 */
export async function GET() {
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

    // Get current Stripe status from database
    const { data: connectStatus } = await (supabase.rpc as CallableFunction)('get_stripe_connect_status')
    const statusResult = connectStatus as {
      success: boolean
      account_id?: string
      status?: string
      charges_enabled?: boolean
      payouts_enabled?: boolean
      error?: string
    } | null

    if (!statusResult?.success) {
      return NextResponse.json(
        { error: statusResult?.error || 'Failed to get status' },
        { status: 500 }
      )
    }

    // If no account connected, return current status
    if (!statusResult.account_id) {
      return NextResponse.json({
        success: true,
        status: 'not_connected',
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: null,
      })
    }

    // Fetch live status from Stripe
    const stripe = getStripeServer()
    let account

    try {
      account = await stripe.accounts.retrieve(statusResult.account_id)
    } catch (stripeError) {
      // Account may have been deleted or is inaccessible
      console.error('Failed to retrieve Stripe account:', stripeError)
      return NextResponse.json({
        success: true,
        status: statusResult.status || 'error',
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: null,
        error: 'Unable to fetch account from Stripe',
      })
    }

    // Determine requirements due
    const requirementsDue = account.requirements?.currently_due || []

    // Determine status
    let status = 'active'
    if (!account.charges_enabled && !account.payouts_enabled) {
      if (requirementsDue.length > 0) {
        status = 'onboarding_incomplete'
      } else {
        status = 'restricted'
      }
    }

    // Sync to database via service role if status changed
    // Note: This is best-effort; webhooks are the primary sync mechanism
    if (
      statusResult.charges_enabled !== account.charges_enabled ||
      statusResult.payouts_enabled !== account.payouts_enabled
    ) {
      // Update in background - don't wait for response
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirementsDue,
        }),
      }).catch(() => {
        // Ignore sync errors - webhook will handle it
      })
    }

    return NextResponse.json({
      success: true,
      accountId: account.id,
      status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirementsDue: requirementsDue.length > 0 ? requirementsDue : null,
      dashboardUrl: account.charges_enabled
        ? `https://dashboard.stripe.com/${account.id}`
        : null,
    })
  } catch (error) {
    console.error('Stripe connect status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get Stripe status' },
      { status: 500 }
    )
  }
}
