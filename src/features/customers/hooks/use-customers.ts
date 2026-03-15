'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type { Customer, CustomerType, CustomerWithProperties } from '@/types/database'

// ============================================================================
// Customers Queries
// ============================================================================

/**
 * Fetch all customers for the current workspace
 */
export function useCustomers(options?: { includeInactive?: boolean }) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? [...queryKeys.customers(workspace.tenantId), options]
      : ['customers', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      let query = supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .is('archived_at', null)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (!options?.includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)
      return data as Customer[]
    },
    enabled: !!workspace,
  })
}

/**
 * Search customers by name, email, or phone
 */
export function useSearchCustomers(searchTerm: string) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: ['customers-search', workspace?.tenantId, searchTerm],
    queryFn: async () => {
      if (!workspace || !searchTerm || searchTerm.length < 2) return []

      const supabase = createClient()
      const term = `%${searchTerm}%`

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .is('archived_at', null)
        .eq('is_active', true)
        .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
        .order('last_name', { ascending: true })
        .limit(20)

      if (error) throw new Error(error.message)
      return data as Customer[]
    },
    enabled: !!workspace && searchTerm.length >= 2,
  })
}

/**
 * Fetch a single customer by ID with their properties
 */
export function useCustomer(customerId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && customerId
      ? queryKeys.customer(workspace.tenantId, customerId)
      : ['customer', 'none'],
    queryFn: async () => {
      if (!workspace || !customerId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          properties (*)
        `)
        .eq('id', customerId)
        .eq('tenant_id', workspace.tenantId)
        .single()

      if (error) throw new Error(error.message)
      return data as CustomerWithProperties
    },
    enabled: !!workspace && !!customerId,
  })
}

// ============================================================================
// Customers Mutations
// ============================================================================

export type CreateCustomerInput = {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  phone_secondary?: string
  customer_type?: CustomerType
  preferred_contact_method?: 'email' | 'phone' | 'sms'
  notes?: string
  internal_notes?: string
}

export type UpdateCustomerInput = Partial<CreateCustomerInput> & {
  is_active?: boolean
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      if (!workspace) throw new Error('No workspace selected')

      const supabase = createClient()
      const { data, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: workspace.tenantId,
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          phone: input.phone,
          phone_secondary: input.phone_secondary,
          customer_type: input.customer_type ?? 'lead',
          preferred_contact_method: input.preferred_contact_method,
          notes: input.notes,
          internal_notes: input.internal_notes,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Customer
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers(workspace.tenantId) })
      }
    },
  })
}

/**
 * Update an existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCustomerInput & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Customer
    },
    onSuccess: (data) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers(workspace.tenantId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.customer(workspace.tenantId, data.id) })
      }
    },
  })
}

/**
 * Archive a customer (soft delete)
 */
export function useArchiveCustomer() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (customerId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('customers')
        .update({
          archived_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', customerId)

      if (error) throw new Error(error.message)
      return { id: customerId }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers(workspace.tenantId) })
      }
    },
  })
}
