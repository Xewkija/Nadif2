'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type {
  PricingRule,
  PricingRuleCategory,
  PricingRuleTrigger,
  ServiceTypeCode,
  Json,
} from '@/types/database'

// ============================================================================
// Pricing Rules Queries
// ============================================================================

/**
 * Fetch all pricing rules for the current workspace
 */
export function usePricingRules() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace ? queryKeys.pricingRules(workspace.tenantId) : ['pricing-rules', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('priority', { ascending: true })
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw new Error(error.message)
      return data as PricingRule[]
    },
    enabled: !!workspace,
  })
}

/**
 * Fetch a single pricing rule by ID
 */
export function usePricingRule(ruleId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: ['pricing-rule', workspace?.tenantId, ruleId],
    queryFn: async () => {
      if (!workspace || !ruleId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('id', ruleId)
        .eq('tenant_id', workspace.tenantId)
        .single()

      if (error) throw new Error(error.message)
      return data as PricingRule
    },
    enabled: !!workspace && !!ruleId,
  })
}

// ============================================================================
// Pricing Rules Mutations
// ============================================================================

export type CreatePricingRuleInput = {
  name: string
  description?: string
  category: PricingRuleCategory
  trigger_type: PricingRuleTrigger
  trigger_conditions?: object
  adjustment_type: 'percentage' | 'fixed'
  adjustment_value: number
  priority?: number
  is_stackable?: boolean
  applies_to_service_ids?: string[]
  applies_to_service_types?: ServiceTypeCode[]
  location_id?: string
  valid_from?: string
  valid_until?: string
}

export type UpdatePricingRuleInput = Partial<CreatePricingRuleInput> & {
  is_active?: boolean
}

/**
 * Create a new pricing rule
 */
export function useCreatePricingRule() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: CreatePricingRuleInput) => {
      if (!workspace) throw new Error('No workspace selected')

      const supabase = createClient()
      const { data, error } = await supabase
        .from('pricing_rules')
        .insert({
          tenant_id: workspace.tenantId,
          name: input.name,
          description: input.description,
          category: input.category,
          trigger_type: input.trigger_type,
          trigger_conditions: (input.trigger_conditions ?? {}) as Json,
          adjustment_type: input.adjustment_type,
          adjustment_value: input.adjustment_value,
          priority: input.priority ?? 100,
          is_stackable: input.is_stackable ?? true,
          applies_to_service_ids: input.applies_to_service_ids,
          applies_to_service_types: input.applies_to_service_types,
          location_id: input.location_id,
          valid_from: input.valid_from,
          valid_until: input.valid_until,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.pricingRules(workspace.tenantId) })
      }
    },
  })
}

/**
 * Update an existing pricing rule
 */
export function useUpdatePricingRule() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePricingRuleInput & { id: string }) => {
      const supabase = createClient()

      // Build update object
      const updateData: Record<string, unknown> = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.category !== undefined) updateData.category = updates.category
      if (updates.trigger_type !== undefined) updateData.trigger_type = updates.trigger_type
      if (updates.trigger_conditions !== undefined)
        updateData.trigger_conditions = updates.trigger_conditions as Json
      if (updates.adjustment_type !== undefined) updateData.adjustment_type = updates.adjustment_type
      if (updates.adjustment_value !== undefined) updateData.adjustment_value = updates.adjustment_value
      if (updates.priority !== undefined) updateData.priority = updates.priority
      if (updates.is_stackable !== undefined) updateData.is_stackable = updates.is_stackable
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active
      if (updates.applies_to_service_ids !== undefined)
        updateData.applies_to_service_ids = updates.applies_to_service_ids
      if (updates.applies_to_service_types !== undefined)
        updateData.applies_to_service_types = updates.applies_to_service_types
      if (updates.location_id !== undefined) updateData.location_id = updates.location_id
      if (updates.valid_from !== undefined) updateData.valid_from = updates.valid_from
      if (updates.valid_until !== undefined) updateData.valid_until = updates.valid_until

      const { error } = await supabase
        .from('pricing_rules')
        .update(updateData)
        .eq('id', id)

      if (error) throw new Error(error.message)
      return { id }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.pricingRules(workspace.tenantId) })
      }
    },
  })
}

/**
 * Delete a pricing rule
 */
export function useDeletePricingRule() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw new Error(error.message)
      return { id: ruleId }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.pricingRules(workspace.tenantId) })
      }
    },
  })
}
