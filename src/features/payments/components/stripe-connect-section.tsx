'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
} from 'lucide-react'
import {
  useStripeConnectStatus,
  useCreateStripeConnect,
  useRefreshStripeConnectLink,
} from '../hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

const statusConfig = {
  not_connected: {
    badge: 'secondary',
    label: 'Not Connected',
    description: 'Connect your Stripe account to start accepting payments.',
  },
  onboarding_started: {
    badge: 'warning',
    label: 'Setup In Progress',
    description: 'Continue setting up your Stripe account to accept payments.',
  },
  onboarding_incomplete: {
    badge: 'warning',
    label: 'Setup Incomplete',
    description: 'Additional information is required to complete your Stripe setup.',
  },
  restricted: {
    badge: 'destructive',
    label: 'Action Required',
    description: 'Your Stripe account has restrictions. Please check your Stripe dashboard.',
  },
  active: {
    badge: 'success',
    label: 'Connected',
    description: 'Your Stripe account is active and ready to accept payments.',
  },
} as const

export function StripeConnectSection() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const { data: status, isLoading, error, refetch } = useStripeConnectStatus()
  const createMutation = useCreateStripeConnect()
  const refreshMutation = useRefreshStripeConnectLink()

  // Handle return from Stripe onboarding
  useEffect(() => {
    const stripeConnect = searchParams.get('stripe_connect')
    if (stripeConnect === 'complete' || stripeConnect === 'refresh') {
      // Clear the URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('stripe_connect')
      router.replace(url.pathname, { scroll: false })

      // Refetch status
      refetch()
    }
  }, [searchParams, router, refetch])

  const handleConnect = async () => {
    try {
      const result = await createMutation.mutateAsync()
      // Redirect to Stripe onboarding
      window.location.href = result.onboardingUrl
    } catch (err) {
      console.error('Failed to create Stripe account:', err)
    }
  }

  const handleContinueSetup = async () => {
    try {
      const result = await refreshMutation.mutateAsync()
      window.location.href = result.onboardingUrl
    } catch (err) {
      console.error('Failed to refresh onboarding link:', err)
    }
  }

  const handleOpenDashboard = () => {
    if (status?.dashboardUrl) {
      window.open(status.dashboardUrl, '_blank')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load Stripe status. Please refresh the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const currentStatus = status?.status || 'not_connected'
  const config = statusConfig[currentStatus]
  const isPending = createMutation.isPending || refreshMutation.isPending

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Stripe Connect</CardTitle>
              <CardDescription>Accept card payments from your customers</CardDescription>
            </div>
          </div>
          <Badge variant={config.badge as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{config.description}</p>

        {/* Status indicators */}
        {status?.chargesEnabled !== undefined && currentStatus !== 'not_connected' && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              {status.chargesEnabled ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
              <span className={status.chargesEnabled ? 'text-success' : 'text-muted-foreground'}>
                {status.chargesEnabled ? 'Can accept payments' : 'Cannot accept payments yet'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {status.payoutsEnabled ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
              <span className={status.payoutsEnabled ? 'text-success' : 'text-muted-foreground'}>
                {status.payoutsEnabled ? 'Payouts active' : 'Payouts pending setup'}
              </span>
            </div>
          </div>
        )}

        {/* Requirements due */}
        {status?.requirementsDue && status.requirementsDue.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Stripe requires additional information: {status.requirementsDue.length} item
              {status.requirementsDue.length > 1 ? 's' : ''} pending.
            </AlertDescription>
          </Alert>
        )}

        {/* Error from mutations */}
        {(createMutation.error || refreshMutation.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {createMutation.error?.message || refreshMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {currentStatus === 'not_connected' && (
            <Button onClick={handleConnect} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Connect Stripe Account
            </Button>
          )}

          {(currentStatus === 'onboarding_started' || currentStatus === 'onboarding_incomplete') && (
            <Button onClick={handleContinueSetup} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Continue Setup
            </Button>
          )}

          {currentStatus === 'restricted' && (
            <Button variant="outline" onClick={handleContinueSetup} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Resolve Issues
            </Button>
          )}

          {currentStatus === 'active' && status?.dashboardUrl && (
            <Button variant="outline" onClick={handleOpenDashboard}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Stripe Dashboard
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
