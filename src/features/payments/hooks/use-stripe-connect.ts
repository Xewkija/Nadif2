'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useActiveWorkspace } from '@/lib/queries/workspace'

// ============================================================================
// Types
// ============================================================================

export type StripeConnectStatus = {
  success: boolean
  accountId?: string
  status: 'not_connected' | 'onboarding_started' | 'onboarding_incomplete' | 'restricted' | 'active'
  chargesEnabled: boolean
  payoutsEnabled: boolean
  requirementsDue: string[] | null
  dashboardUrl?: string
  error?: string
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get Stripe Connect status for the current tenant
 */
export function useStripeConnectStatus() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? ['stripe-connect-status', workspace.tenantId]
      : ['stripe-connect-status', 'none'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/connect/status')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get Stripe status')
      }
      return response.json() as Promise<StripeConnectStatus>
    },
    enabled: !!workspace,
    staleTime: 30000, // 30 seconds
  })
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new Stripe Connect account and get onboarding URL
 */
export function useCreateStripeConnect() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/stripe/connect/create', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create Stripe account')
      }
      return response.json() as Promise<{
        success: boolean
        accountId: string
        onboardingUrl: string
      }>
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: ['stripe-connect-status', workspace.tenantId],
        })
      }
    },
  })
}

/**
 * Refresh Stripe Connect onboarding link
 */
export function useRefreshStripeConnectLink() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/stripe/connect/refresh', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to refresh onboarding link')
      }
      return response.json() as Promise<{
        success: boolean
        onboardingUrl: string
      }>
    },
  })
}
