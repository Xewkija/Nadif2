'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type { AddOn, AddOnScopeMode, ServiceTypeCode, Json } from '@/types/database'

// ============================================================================
// Add-ons Queries
// ============================================================================

/**
 * Fetch all add-ons for the current workspace
 */
export function useAddOns() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace ? queryKeys.addOns(workspace.tenantId) : ['add-ons', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('add_ons')
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .is('archived_at', null)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw new Error(error.message)
      return data as AddOn[]
    },
    enabled: !!workspace,
  })
}

/**
 * Fetch add-ons applicable to a specific service
 */
export function useAddOnsForService(serviceId: string | undefined, serviceType: ServiceTypeCode | undefined) {
  const { data: allAddOns } = useAddOns()

  // Filter add-ons based on scoping rules
  const applicableAddOns = allAddOns?.filter((addOn) => {
    if (addOn.scope_mode === 'all_services') return true

    if (addOn.scope_mode === 'specific_services' && serviceId) {
      return addOn.scoped_service_ids?.includes(serviceId)
    }

    if (addOn.scope_mode === 'service_types' && serviceType) {
      return addOn.scoped_service_types?.includes(serviceType)
    }

    return false
  })

  return { data: applicableAddOns, isLoading: !allAddOns }
}

/**
 * Fetch a single add-on by ID
 */
export function useAddOn(addOnId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && addOnId
      ? queryKeys.addOn(workspace.tenantId, addOnId)
      : ['add-on', 'none'],
    queryFn: async () => {
      if (!workspace || !addOnId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('add_ons')
        .select('*')
        .eq('id', addOnId)
        .eq('tenant_id', workspace.tenantId)
        .single()

      if (error) throw new Error(error.message)
      return data as AddOn
    },
    enabled: !!workspace && !!addOnId,
  })
}

// ============================================================================
// Add-ons Mutations
// ============================================================================

export type CreateAddOnInput = {
  name: string
  description?: string
  price_cents: number
  price_type?: 'flat' | 'per_room' | 'per_sqft' | 'hourly'
  scope_mode?: AddOnScopeMode
  scoped_service_ids?: string[]
  scoped_service_types?: ServiceTypeCode[]
  icon_name?: string
}

export type UpdateAddOnInput = Partial<CreateAddOnInput> & {
  is_active?: boolean
}

/**
 * Create a new add-on
 */
export function useCreateAddOn() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: CreateAddOnInput) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_add_on', {
        p_name: input.name,
        p_price_cents: input.price_cents,
        p_description: input.description,
        p_price_type: input.price_type ?? 'flat',
        p_scope_mode: input.scope_mode ?? 'all_services',
        p_scoped_service_ids: input.scoped_service_ids,
        p_scoped_service_types: input.scoped_service_types,
      })

      if (error) throw new Error(error.message)

      const result = data as { success: boolean; add_on_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to create add-on')

      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.addOns(workspace.tenantId) })
      }
    },
  })
}

/**
 * Update an existing add-on
 */
export function useUpdateAddOn() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAddOnInput & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('add_ons')
        .update(updates as Record<string, Json>)
        .eq('id', id)

      if (error) throw new Error(error.message)
      return { id }
    },
    onSuccess: ({ id }) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.addOns(workspace.tenantId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.addOn(workspace.tenantId, id) })
      }
    },
  })
}

/**
 * Archive an add-on (soft delete)
 */
export function useArchiveAddOn() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (addOnId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('add_ons')
        .update({
          archived_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', addOnId)

      if (error) throw new Error(error.message)
      return { id: addOnId }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.addOns(workspace.tenantId) })
      }
    },
  })
}
