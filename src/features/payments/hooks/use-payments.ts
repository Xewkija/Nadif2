'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type { Json } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export type PaymentMethod = {
  id: string
  customer_id: string
  stripe_payment_method_id: string
  card_brand: string
  card_last_four: string
  card_exp_month: number
  card_exp_year: number
  is_default: boolean
  is_active: boolean
  created_at: string
}

export type PaymentRequirements = {
  card_required: boolean
  card_required_reason: string | null
  deposit_required: boolean
  deposit_amount_cents: number
  deposit_reason: string | null
  prepayment_required: boolean
  has_card_on_file: boolean
}

export type PaymentGatePolicy = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  gate_type: string
  deposit_percentage: number | null
  deposit_flat_cents: number | null
  min_booking_amount_cents: number | null
  applies_to_customer_types: string[] | null
  applies_to_service_types: string[] | null
  priority: number
  is_active: boolean
  created_at: string
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch payment methods for a customer
 * Note: Table created in migration 00015_payment_system.sql
 */
export function useCustomerPaymentMethods(customerId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && customerId
      ? queryKeys.customerPaymentMethods(workspace.tenantId, customerId)
      : ['payment-methods', 'none'],
    queryFn: async () => {
      if (!workspace || !customerId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('customer_payment_methods' as never)
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as PaymentMethod[]
    },
    enabled: !!workspace && !!customerId,
  })
}

/**
 * Evaluate payment requirements for a booking or customer
 * Note: RPC created in migration 00015_payment_system.sql
 */
export function useEvaluatePaymentGate(options: {
  bookingId?: string
  customerId?: string
  serviceId?: string
  amountCents?: number
}) {
  const { data: workspace } = useActiveWorkspace()
  const { bookingId, customerId, serviceId, amountCents } = options

  return useQuery({
    queryKey: workspace
      ? ['payment-gate', workspace.tenantId, bookingId, customerId, serviceId, amountCents]
      : ['payment-gate', 'none'],
    queryFn: async () => {
      if (!workspace) return null

      const supabase = createClient()
      const { data, error } = await supabase.rpc('evaluate_payment_gate' as never, {
        p_booking_id: bookingId,
        p_customer_id: customerId,
        p_service_id: serviceId,
        p_amount_cents: amountCents,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; requirements?: PaymentRequirements; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to evaluate payment gate')

      return result.requirements!
    },
    enabled: !!workspace && !!(bookingId || customerId),
  })
}

/**
 * Fetch payment gate policies
 */
export function usePaymentGatePolicies() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.paymentPolicies(workspace.tenantId)
      : ['payment-policies', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('payment_gate_policies')
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('priority', { ascending: true })

      if (error) throw new Error(error.message)
      return data as PaymentGatePolicy[]
    },
    enabled: !!workspace,
  })
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Save a payment method after Stripe setup
 * Note: RPC created in migration 00015_payment_system.sql
 */
export function useSavePaymentMethod() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      customerId: string
      stripePaymentMethodId: string
      stripeCustomerId: string
      cardBrand: string
      cardLastFour: string
      cardExpMonth: number
      cardExpYear: number
      setAsDefault?: boolean
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('save_payment_method' as never, {
        p_customer_id: input.customerId,
        p_stripe_payment_method_id: input.stripePaymentMethodId,
        p_stripe_customer_id: input.stripeCustomerId,
        p_card_brand: input.cardBrand,
        p_card_last_four: input.cardLastFour,
        p_card_exp_month: input.cardExpMonth,
        p_card_exp_year: input.cardExpYear,
        p_set_as_default: input.setAsDefault ?? true,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; payment_method_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to save payment method')

      return result
    },
    onSuccess: (_, { customerId }) => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.customerPaymentMethods(workspace.tenantId, customerId),
        })
      }
    },
  })
}

/**
 * Remove a payment method
 * Note: RPC created in migration 00015_payment_system.sql
 */
export function useRemovePaymentMethod() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ paymentMethodId, customerId }: { paymentMethodId: string; customerId: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('remove_payment_method' as never, {
        p_payment_method_id: paymentMethodId,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; stripe_payment_method_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to remove payment method')

      return result
    },
    onSuccess: (_, { customerId }) => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.customerPaymentMethods(workspace.tenantId, customerId),
        })
      }
    },
  })
}

/**
 * Create or update a payment gate policy
 * Note: RPC created in migration 00015_payment_system.sql
 */
export function useUpsertPaymentGatePolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      name?: string
      description?: string
      gateType?: string
      depositPercentage?: number | null
      depositFlatCents?: number | null
      minBookingAmountCents?: number | null
      appliesToCustomerTypes?: string[] | null
      appliesToServiceTypes?: string[] | null
      priority?: number
      isActive?: boolean
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('upsert_payment_gate_policy' as never, {
        p_id: input.id,
        p_name: input.name,
        p_description: input.description,
        p_gate_type: input.gateType,
        p_deposit_percentage: input.depositPercentage,
        p_deposit_flat_cents: input.depositFlatCents,
        p_min_booking_amount_cents: input.minBookingAmountCents,
        p_applies_to_customer_types: input.appliesToCustomerTypes as unknown as Json,
        p_applies_to_service_types: input.appliesToServiceTypes as unknown as Json,
        p_priority: input.priority,
        p_is_active: input.isActive,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; policy_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to save policy')

      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.paymentPolicies(workspace.tenantId),
        })
      }
    },
  })
}

/**
 * Delete a payment gate policy
 */
export function useDeletePaymentGatePolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (policyId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('payment_gate_policies')
        .delete()
        .eq('id', policyId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.paymentPolicies(workspace.tenantId),
        })
      }
    },
  })
}
