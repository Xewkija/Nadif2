'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type {
  RecurringSeries,
  RecurringSeriesStatus,
  BookingFrequencyCode,
  TimeWindowCode,
  Json,
} from '@/types/database'

// Extended series type with relations
export type RecurringSeriesWithRelations = RecurringSeries & {
  customer?: {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
  } | null
  property?: {
    id: string
    address_line1: string
    city: string
    state: string
    postal_code?: string
  } | null
  service?: {
    id: string
    name: string
    service_type: string
    base_price_cents: number
  } | null
  override_service?: {
    id: string
    name: string
    service_type: string
    base_price_cents: number
  } | null
}

type RecurringSeriesRpcResult = {
  success: boolean
  series_id?: string
  first_booking_id?: string
  error?: string
  deep_clean_check?: {
    required: boolean
    reasons: unknown[]
  }
}

// ============================================================================
// Queries
// ============================================================================

export type RecurringSeriesFilters = {
  status?: RecurringSeriesStatus | RecurringSeriesStatus[]
  customerId?: string
  propertyId?: string
}

/**
 * Fetch recurring series for the current workspace
 */
export function useRecurringSeries(filters?: RecurringSeriesFilters) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.recurringSeries(workspace.tenantId)
      : ['recurring-series', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      let query = supabase
        .from('recurring_series')
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, phone),
          property:properties(id, address_line1, city, state, postal_code),
          service:services!recurring_series_service_id_fkey(id, name, service_type, base_price_cents),
          override_service:services!recurring_series_first_occurrence_override_service_id_fkey(id, name, service_type, base_price_cents)
        `)
        .eq('tenant_id', workspace.tenantId)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }

      if (filters?.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }

      const { data, error } = await query.limit(100)

      if (error) throw new Error(error.message)
      return data as unknown as RecurringSeriesWithRelations[]
    },
    enabled: !!workspace,
  })
}

/**
 * Fetch a single recurring series by ID
 */
export function useRecurringSeriesDetail(seriesId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && seriesId
      ? queryKeys.series(workspace.tenantId, seriesId)
      : ['series', 'none'],
    queryFn: async () => {
      if (!workspace || !seriesId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('recurring_series')
        .select(`
          *,
          customer:customers(*),
          property:properties(*),
          service:services!recurring_series_service_id_fkey(*),
          override_service:services!recurring_series_first_occurrence_override_service_id_fkey(*)
        `)
        .eq('id', seriesId)
        .eq('tenant_id', workspace.tenantId)
        .single()

      if (error) throw new Error(error.message)
      return data as unknown as RecurringSeriesWithRelations
    },
    enabled: !!workspace && !!seriesId,
  })
}

/**
 * Fetch occurrences (bookings) for a series
 */
export function useSeriesOccurrences(seriesId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && seriesId
      ? queryKeys.seriesOccurrences(workspace.tenantId, seriesId)
      : ['series-occurrences', 'none'],
    queryFn: async () => {
      if (!workspace || !seriesId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          scheduled_date,
          scheduled_time_window,
          scheduled_time_start,
          is_first_occurrence_override,
          total_price_cents,
          service:services(id, name),
          provider:profiles(id, full_name)
        `)
        .eq('recurring_series_id', seriesId)
        .eq('tenant_id', workspace.tenantId)
        .order('scheduled_date', { ascending: true })

      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!workspace && !!seriesId,
  })
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new recurring series
 */
export function useCreateRecurringSeries() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      customer_id: string
      property_id: string
      service_id: string
      frequency: BookingFrequencyCode
      start_date: string
      preferred_day_of_week?: number
      preferred_time_window?: TimeWindowCode
      end_date?: string
      notes?: string
      generate_first_occurrence?: boolean
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_recurring_series', {
        p_customer_id: input.customer_id,
        p_property_id: input.property_id,
        p_service_id: input.service_id,
        p_frequency: input.frequency,
        p_start_date: input.start_date,
        p_preferred_day_of_week: input.preferred_day_of_week,
        p_preferred_time_window: input.preferred_time_window ?? 'anytime',
        p_end_date: input.end_date,
        p_notes: input.notes,
        p_generate_first_occurrence: input.generate_first_occurrence ?? true,
      })

      if (error) throw new Error(error.message)
      const result = data as RecurringSeriesRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to create recurring series')
      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringSeries(workspace.tenantId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
      }
    },
  })
}

/**
 * Pause a recurring series
 */
export function usePauseSeries() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ seriesId, reason }: { seriesId: string; reason?: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('pause_series', {
        p_series_id: seriesId,
        p_reason: reason,
      })

      if (error) throw new Error(error.message)
      const result = data as RecurringSeriesRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to pause series')
      return result
    },
    onSuccess: (_, { seriesId }) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringSeries(workspace.tenantId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.series(workspace.tenantId, seriesId) })
      }
    },
  })
}

/**
 * Resume a paused recurring series
 */
export function useResumeSeries() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ seriesId, resumeDate }: { seriesId: string; resumeDate?: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('resume_series', {
        p_series_id: seriesId,
        p_resume_date: resumeDate,
      })

      if (error) throw new Error(error.message)
      const result = data as RecurringSeriesRpcResult & {
        deep_clean_check?: { required: boolean; reasons: unknown[] }
      }
      if (!result.success) throw new Error(result.error ?? 'Failed to resume series')
      return result
    },
    onSuccess: (_, { seriesId }) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringSeries(workspace.tenantId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.series(workspace.tenantId, seriesId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
      }
    },
  })
}

/**
 * Cancel a recurring series
 */
export function useCancelSeries() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({
      seriesId,
      reason,
      cancelFutureBookings = true,
    }: {
      seriesId: string
      reason?: string
      cancelFutureBookings?: boolean
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('cancel_series', {
        p_series_id: seriesId,
        p_reason: reason,
        p_cancel_future_bookings: cancelFutureBookings,
      })

      if (error) throw new Error(error.message)
      const result = data as RecurringSeriesRpcResult & { cancelled_future_bookings?: number }
      if (!result.success) throw new Error(result.error ?? 'Failed to cancel series')
      return result
    },
    onSuccess: (_, { seriesId }) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringSeries(workspace.tenantId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.series(workspace.tenantId, seriesId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
      }
    },
  })
}

/**
 * Generate future occurrences for a series
 */
export function useGenerateOccurrences() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (seriesId?: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('generate_future_occurrences', {
        p_series_id: seriesId,
      })

      if (error) throw new Error(error.message)
      const result = data as { success: boolean; generated_count: number; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to generate occurrences')
      return result
    },
    onSuccess: (_, seriesId) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        if (seriesId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.seriesOccurrences(workspace.tenantId, seriesId),
          })
        }
      }
    },
  })
}

/**
 * Resolve first occurrence override for a service
 */
export function useResolveFirstOccurrenceOverride() {
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('resolve_first_occurrence_override', {
        p_service_id: serviceId,
      })

      if (error) throw new Error(error.message)
      const result = data as {
        success: boolean
        maintenance_service_id?: string
        maintenance_service_name?: string
        override_service_id?: string
        override_service_name?: string
        override_service_type?: string
        resolution_source?: 'service' | 'tenant_default'
        error?: string
        resolution?: string
      }
      return result
    },
  })
}

/**
 * Evaluate deep clean requirement
 */
export function useEvaluateDeepClean() {
  return useMutation({
    mutationFn: async ({
      customerId,
      propertyId,
      serviceId,
    }: {
      customerId: string
      propertyId: string
      serviceId?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('evaluate_deep_clean_required', {
        p_customer_id: customerId,
        p_property_id: propertyId,
        p_service_id: serviceId,
      })

      if (error) throw new Error(error.message)
      const result = data as {
        success: boolean
        required: boolean
        reasons: Array<{ type: string; reason: string; policy_id?: string }>
        history: {
          last_deep_clean_at: string | null
          days_since_deep_clean: number | null
          cleanings_since_deep_clean: number | null
          last_any_clean_at: string | null
        }
        error?: string
      }
      return result
    },
  })
}
