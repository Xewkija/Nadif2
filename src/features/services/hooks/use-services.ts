'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type {
  Service,
  ServiceTypeCode,
  BookingFrequencyCode,
  Json,
} from '@/types/database'

// ============================================================================
// Services Queries
// ============================================================================

/**
 * Fetch all services for the current workspace
 */
export function useServices() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace ? queryKeys.services(workspace.tenantId) : ['services', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*),
          override_service:services!fk_services_first_occurrence_override(id, name)
        `)
        .eq('tenant_id', workspace.tenantId)
        .is('archived_at', null)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw new Error(error.message)

      // Transform the data to handle the FK relationship shape
      return (data ?? []).map((service) => ({
        ...service,
        category: service.category,
        override_service: Array.isArray(service.override_service)
          ? service.override_service[0] ?? null
          : service.override_service,
      })) as (Service & {
        category: { id: string; name: string } | null
        override_service: { id: string; name: string } | null
      })[]
    },
    enabled: !!workspace,
  })
}

/**
 * Fetch a single service by ID
 */
export function useService(serviceId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && serviceId
      ? queryKeys.service(workspace.tenantId, serviceId)
      : ['service', 'none'],
    queryFn: async () => {
      if (!workspace || !serviceId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*),
          override_service:services!fk_services_first_occurrence_override(id, name, service_type, base_price_cents)
        `)
        .eq('id', serviceId)
        .eq('tenant_id', workspace.tenantId)
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!workspace && !!serviceId,
  })
}

/**
 * Fetch service categories
 */
export function useServiceCategories() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace ? queryKeys.serviceCategories(workspace.tenantId) : ['categories', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!workspace,
  })
}

// ============================================================================
// Services Mutations
// ============================================================================

export type CreateServiceInput = {
  name: string
  description?: string
  service_type: ServiceTypeCode
  base_price_cents: number
  category_id?: string
  estimated_duration_minutes?: number
  requires_quote?: boolean
  is_recurring_eligible?: boolean
  allowed_frequencies?: BookingFrequencyCode[]
  first_occurrence_override_service_id?: string
  icon_name?: string
  color_hex?: string
}

export type UpdateServiceInput = Partial<CreateServiceInput> & {
  is_active?: boolean
}

/**
 * Create a new service
 */
export function useCreateService() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_service', {
        p_name: input.name,
        p_service_type: input.service_type,
        p_base_price_cents: input.base_price_cents,
        p_description: input.description,
        p_category_id: input.category_id,
        p_estimated_duration_minutes: input.estimated_duration_minutes ?? 120,
        p_requires_quote: input.requires_quote ?? false,
        p_is_recurring_eligible: input.is_recurring_eligible ?? true,
        p_allowed_frequencies: input.allowed_frequencies ?? ['onetime', 'weekly', 'biweekly', 'monthly'],
        p_first_occurrence_override_service_id: input.first_occurrence_override_service_id,
      })

      if (error) throw new Error(error.message)

      const result = data as { success: boolean; service_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to create service')

      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.services(workspace.tenantId) })
      }
    },
  })
}

/**
 * Update an existing service
 */
export function useUpdateService() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateServiceInput & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('services')
        .update(updates as Record<string, Json>)
        .eq('id', id)

      if (error) throw new Error(error.message)
      return { id }
    },
    onSuccess: ({ id }) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.services(workspace.tenantId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.service(workspace.tenantId, id) })
      }
    },
  })
}

/**
 * Archive a service (soft delete)
 */
export function useArchiveService() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('services')
        .update({
          archived_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', serviceId)

      if (error) throw new Error(error.message)
      return { id: serviceId }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.services(workspace.tenantId) })
      }
    },
  })
}

/**
 * Resolve first occurrence override for a service
 */
export function useResolveOverride(serviceId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: ['override-resolution', workspace?.tenantId, serviceId],
    queryFn: async () => {
      if (!workspace || !serviceId) return null

      const supabase = createClient()
      const { data, error } = await supabase.rpc('resolve_first_occurrence_override', {
        p_service_id: serviceId,
      })

      if (error) throw new Error(error.message)
      return data as {
        success: boolean
        override_service_id?: string
        override_service_name?: string
        resolution_source?: string
        error?: string
      }
    },
    enabled: !!workspace && !!serviceId,
  })
}
