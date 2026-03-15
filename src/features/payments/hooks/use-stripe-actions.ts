'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import { queryKeys } from '@/lib/queries/keys'

// ============================================================================
// Types
// ============================================================================

export type PaymentTransaction = {
  id: string
  transaction_type: 'charge' | 'deposit' | 'refund' | 'void'
  amount_cents: number
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
  description: string | null
  failure_reason: string | null
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  stripe_refund_id: string | null
  created_at: string
  completed_at: string | null
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get payment transactions for a booking
 */
export function useBookingTransactions(bookingId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && bookingId
      ? ['booking-transactions', workspace.tenantId, bookingId]
      : ['booking-transactions', 'none'],
    queryFn: async () => {
      if (!bookingId) return []

      const supabase = createClient()
      const { data, error } = await (supabase.rpc as CallableFunction)('get_booking_transactions', {
        p_booking_id: bookingId,
      })

      if (error) throw new Error(error.message)
      const result = data as { success: boolean; transactions?: PaymentTransaction[]; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to get transactions')

      return result.transactions ?? []
    },
    enabled: !!workspace && !!bookingId,
  })
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a SetupIntent for saving a card
 */
export function useCreateSetupIntent() {
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({
      customerId,
      setAsDefault = true,
    }: {
      customerId: string
      setAsDefault?: boolean
    }) => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-setup-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ customerId, setAsDefault }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create setup intent')
      }

      return response.json() as Promise<{
        success: boolean
        clientSecret: string
        stripeCustomerId: string
        connectedAccountId: string
      }>
    },
  })
}

/**
 * Create a PaymentIntent and charge a card
 */
export function useCreatePaymentIntent() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({
      bookingId,
      amountCents,
      paymentMethodId,
      transactionType = 'charge',
    }: {
      bookingId: string
      amountCents: number
      paymentMethodId?: string
      transactionType?: 'charge' | 'deposit'
    }) => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ bookingId, amountCents, paymentMethodId, transactionType }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create payment')
      }

      return response.json() as Promise<{
        success: boolean
        paymentIntentId: string
        status: string
        amountCharged: number
      }>
    },
    onSuccess: (_, { bookingId }) => {
      if (workspace) {
        // Invalidate booking data
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
        // Invalidate transactions
        queryClient.invalidateQueries({
          queryKey: ['booking-transactions', workspace.tenantId, bookingId],
        })
      }
    },
  })
}

/**
 * Process a refund
 */
export function useProcessRefund() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({
      bookingId,
      amountCents,
      reason,
    }: {
      bookingId: string
      amountCents?: number
      reason?: string
    }) => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-refund`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ bookingId, amountCents, reason }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process refund')
      }

      return response.json() as Promise<{
        success: boolean
        refundId: string
        status: string
        amountRefunded: number
        isPartialRefund: boolean
      }>
    },
    onSuccess: (_, { bookingId }) => {
      if (workspace) {
        // Invalidate booking data
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
        // Invalidate transactions
        queryClient.invalidateQueries({
          queryKey: ['booking-transactions', workspace.tenantId, bookingId],
        })
      }
    },
  })
}
