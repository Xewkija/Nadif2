'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type {
  Booking,
  BookingStatus,
  BookingFrequencyCode,
  TimeWindowCode,
  BookingRpcResult,
  Json,
} from '@/types/database'

// Extended booking type with relations for list/detail views
export type BookingListItem = Booking & {
  // Payment fields (may not be in generated types yet)
  amount_paid_cents?: number | null
  payment_status?: string | null
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
    address_line2?: string | null
    city: string
    state: string
    postal_code?: string
    bedrooms?: number | null
    bathrooms?: number | null
    square_feet?: number | null
  } | null
  service?: {
    id: string
    name: string
    service_type?: string
    base_price_cents?: number
  } | null
  provider?: {
    id: string
    full_name?: string | null
    email?: string
  } | null
  add_ons?: {
    id: string
    add_on_id: string
    price_cents: number
    add_on?: {
      id: string
      name: string
    }
  }[]
}

// ============================================================================
// Bookings Queries
// ============================================================================

export type BookingFilters = {
  status?: BookingStatus | BookingStatus[]
  customerId?: string
  propertyId?: string
  providerId?: string
  dateFrom?: string
  dateTo?: string
  includeCompleted?: boolean
}

/**
 * Fetch bookings for the current workspace with optional filters
 */
export function useBookings(filters?: BookingFilters) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.bookings(workspace.tenantId, filters)
      : ['bookings', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:customers!bookings_customer_id_fkey(id, first_name, last_name, email, phone),
          property:properties!bookings_property_id_fkey(id, address_line1, address_line2, city, state),
          service:services!bookings_service_id_fkey(id, name, service_type, base_price_cents),
          provider:profiles!bookings_assigned_provider_id_fkey(id, full_name)
        `)
        .eq('tenant_id', workspace.tenantId)
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      // Apply filters
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

      if (filters?.providerId) {
        query = query.eq('assigned_provider_id', filters.providerId)
      }

      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom)
      }

      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo)
      }

      if (!filters?.includeCompleted) {
        query = query.not('status', 'in', '("completed","cancelled","skipped")')
      }

      const { data, error } = await query.limit(100)

      if (error) throw new Error(error.message)
      return data as unknown as BookingListItem[]
    },
    enabled: !!workspace,
  })
}

/**
 * Fetch a single booking by ID with all relations
 */
export function useBooking(bookingId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && bookingId
      ? queryKeys.booking(workspace.tenantId, bookingId)
      : ['booking', 'none'],
    queryFn: async () => {
      if (!workspace || !bookingId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers!bookings_customer_id_fkey(*),
          property:properties!bookings_property_id_fkey(*),
          service:services!bookings_service_id_fkey(*),
          provider:profiles!bookings_assigned_provider_id_fkey(id, full_name, email),
          add_ons:booking_add_ons(
            *,
            add_on:add_ons(*)
          )
        `)
        .eq('id', bookingId)
        .eq('tenant_id', workspace.tenantId)
        .single()

      if (error) throw new Error(error.message)
      return data as unknown as BookingListItem
    },
    enabled: !!workspace && !!bookingId,
  })
}

/**
 * Fetch today's scheduled bookings
 */
export function useTodayBookings() {
  const { data: workspace } = useActiveWorkspace()
  const today = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: workspace ? queryKeys.todaySchedule(workspace.tenantId) : ['today', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers!bookings_customer_id_fkey(id, first_name, last_name, phone),
          property:properties!bookings_property_id_fkey(id, address_line1, city),
          service:services!bookings_service_id_fkey(id, name),
          provider:profiles!bookings_assigned_provider_id_fkey(id, full_name)
        `)
        .eq('tenant_id', workspace.tenantId)
        .eq('scheduled_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_time_start', { ascending: true })

      if (error) throw new Error(error.message)
      return data as unknown as BookingListItem[]
    },
    enabled: !!workspace,
  })
}

// ============================================================================
// Booking Lifecycle Mutations
// ============================================================================

/**
 * Create a draft booking
 */
export function useCreateDraftBooking() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      customer_id: string
      property_id: string
      service_id: string
      frequency?: BookingFrequencyCode
      scheduled_date?: string
      scheduled_time_window?: TimeWindowCode
      scheduled_time_start?: string
      customer_notes?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_draft_booking', {
        p_customer_id: input.customer_id,
        p_property_id: input.property_id,
        p_service_id: input.service_id,
        p_frequency: input.frequency ?? 'onetime',
        p_scheduled_date: input.scheduled_date,
        p_scheduled_time_window: input.scheduled_time_window,
        p_scheduled_time_start: input.scheduled_time_start,
        p_customer_notes: input.customer_notes,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to create draft')
      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
      }
    },
  })
}

/**
 * Update a draft booking
 */
export function useUpdateDraftBooking() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      booking_id: string
      service_id?: string
      scheduled_date?: string
      scheduled_time_window?: TimeWindowCode
      scheduled_time_start?: string
      customer_notes?: string
      internal_notes?: string
    }) => {
      const { booking_id, ...updates } = input
      const supabase = createClient()
      const { data, error } = await supabase.rpc('update_draft_booking', {
        p_booking_id: booking_id,
        p_updates: updates as unknown as Json,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to update draft')
      return result
    },
    onSuccess: (_, variables) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, variables.booking_id),
        })
      }
    },
  })
}

/**
 * Send a quote to the customer
 */
export function useSendQuote() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('send_quote', {
        p_booking_id: bookingId,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to send quote')
      return result
    },
    onSuccess: (_, bookingId) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
      }
    },
  })
}

/**
 * Accept a quote (staff action)
 */
export function useAcceptQuoteByStaff() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('accept_quote_by_staff', {
        p_booking_id: bookingId,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to accept quote')
      return result
    },
    onSuccess: (_, bookingId) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
      }
    },
  })
}

/**
 * Confirm a booking (quote_accepted -> confirmed, or direct confirm)
 */
export function useConfirmBooking() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('confirm_booking', {
        p_booking_id: bookingId,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to confirm booking')
      return result
    },
    onSuccess: (_, bookingId) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardCounters(workspace.tenantId),
        })
      }
    },
  })
}

/**
 * Assign a provider to a booking
 */
export function useAssignProvider() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ bookingId, providerId }: { bookingId: string; providerId: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('assign_provider', {
        p_booking_id: bookingId,
        p_provider_id: providerId,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to assign provider')
      return result
    },
    onSuccess: (_, { bookingId }) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardCounters(workspace.tenantId),
        })
      }
    },
  })
}

/**
 * Unassign a provider from a booking
 */
export function useUnassignProvider() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('unassign_provider', {
        p_booking_id: bookingId,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to unassign provider')
      return result
    },
    onSuccess: (_, bookingId) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
      }
    },
  })
}

/**
 * Provider check-in (start service)
 */
export function useProviderCheckIn() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('provider_check_in', {
        p_booking_id: bookingId,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to check in')
      return result
    },
    onSuccess: (_, bookingId) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.todaySchedule(workspace.tenantId),
        })
      }
    },
  })
}

/**
 * Provider check-out (complete service)
 */
export function useProviderCheckOut() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({
      bookingId,
      completionNotes,
    }: {
      bookingId: string
      completionNotes?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('provider_check_out', {
        p_booking_id: bookingId,
        p_completion_notes: completionNotes,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to check out')
      return result
    },
    onSuccess: (_, { bookingId }) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.todaySchedule(workspace.tenantId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardCounters(workspace.tenantId),
        })
      }
    },
  })
}

/**
 * Cancel a booking
 */
export function useCancelBooking() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({
      bookingId,
      reason,
    }: {
      bookingId: string
      reason?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_reason: reason,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to cancel booking')
      return result
    },
    onSuccess: (_, { bookingId }) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardCounters(workspace.tenantId),
        })
      }
    },
  })
}

/**
 * Skip a recurring occurrence
 */
export function useSkipOccurrence() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('skip_occurrence', {
        p_booking_id: bookingId,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to skip occurrence')
      return result
    },
    onSuccess: (_, bookingId) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(workspace.tenantId, bookingId),
        })
      }
    },
  })
}

/**
 * Reopen a cancelled/expired/declined booking as a new draft
 */
export function useReopenAsDraft() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('reopen_as_draft', {
        p_booking_id: bookingId,
      })

      if (error) throw new Error(error.message)
      const result = data as BookingRpcResult
      if (!result.success) throw new Error(result.error ?? 'Failed to reopen booking')
      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
      }
    },
  })
}
