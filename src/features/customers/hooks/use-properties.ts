'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type { Property, PropertyType, GeocodeConfidence } from '@/types/database'

// ============================================================================
// Properties Queries
// ============================================================================

/**
 * Fetch all properties for a customer
 */
export function useProperties(customerId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && customerId
      ? queryKeys.properties(workspace.tenantId, customerId)
      : ['properties', 'none'],
    queryFn: async () => {
      if (!workspace || !customerId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw new Error(error.message)
      return data as Property[]
    },
    enabled: !!workspace && !!customerId,
  })
}

/**
 * Fetch a single property by ID
 */
export function useProperty(propertyId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && propertyId
      ? queryKeys.property(workspace.tenantId, propertyId)
      : ['property', 'none'],
    queryFn: async () => {
      if (!workspace || !propertyId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('tenant_id', workspace.tenantId)
        .single()

      if (error) throw new Error(error.message)
      return data as Property
    },
    enabled: !!workspace && !!propertyId,
  })
}

// ============================================================================
// Properties Mutations
// ============================================================================

export type CreatePropertyInput = {
  customer_id: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country?: string
  // Property details
  property_type?: PropertyType
  square_feet?: number
  bedrooms?: number
  bathrooms?: number
  floors?: number
  // Access
  access_notes?: string
  gate_code?: string
  key_location?: string
  parking_instructions?: string
  // Pets
  has_pets?: boolean
  pet_details?: string
  // Geocoding
  google_place_id?: string
  latitude?: number
  longitude?: number
  geocode_confidence?: GeocodeConfidence
  // Flags
  is_primary?: boolean
}

export type UpdatePropertyInput = Partial<Omit<CreatePropertyInput, 'customer_id'>> & {
  is_active?: boolean
}

/**
 * Create a new property
 */
export function useCreateProperty() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: CreatePropertyInput) => {
      if (!workspace) throw new Error('No workspace selected')

      const supabase = createClient()

      // If this is the first property or marked as primary, ensure no other primary
      if (input.is_primary) {
        await supabase
          .from('properties')
          .update({ is_primary: false })
          .eq('customer_id', input.customer_id)
          .eq('tenant_id', workspace.tenantId)
      }

      const { data, error } = await supabase
        .from('properties')
        .insert({
          tenant_id: workspace.tenantId,
          customer_id: input.customer_id,
          address_line1: input.address_line1,
          address_line2: input.address_line2,
          city: input.city,
          state: input.state,
          postal_code: input.postal_code,
          country: input.country ?? 'US',
          property_type: input.property_type,
          square_feet: input.square_feet,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          floors: input.floors,
          access_notes: input.access_notes,
          gate_code: input.gate_code,
          key_location: input.key_location,
          parking_instructions: input.parking_instructions,
          has_pets: input.has_pets,
          pet_details: input.pet_details,
          google_place_id: input.google_place_id,
          latitude: input.latitude,
          longitude: input.longitude,
          geocode_confidence: input.geocode_confidence,
          geocoded_at: input.latitude ? new Date().toISOString() : null,
          is_primary: input.is_primary ?? false,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Property
    },
    onSuccess: (data) => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.properties(workspace.tenantId, data.customer_id),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.customer(workspace.tenantId, data.customer_id),
        })
      }
    },
  })
}

/**
 * Update an existing property
 */
export function useUpdateProperty() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePropertyInput & { id: string }) => {
      const supabase = createClient()

      // Get current property to know customer_id
      const { data: current } = await supabase
        .from('properties')
        .select('customer_id')
        .eq('id', id)
        .single()

      if (!current) throw new Error('Property not found')

      // If setting as primary, unset other primaries
      if (updates.is_primary && workspace) {
        await supabase
          .from('properties')
          .update({ is_primary: false })
          .eq('customer_id', current.customer_id)
          .eq('tenant_id', workspace.tenantId)
          .neq('id', id)
      }

      // Update geocoded_at if coordinates changed
      const updateData: Record<string, unknown> = { ...updates }
      if (updates.latitude !== undefined) {
        updateData.geocoded_at = updates.latitude ? new Date().toISOString() : null
      }

      const { data, error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Property
    },
    onSuccess: (data) => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.properties(workspace.tenantId, data.customer_id),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.property(workspace.tenantId, data.id),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.customer(workspace.tenantId, data.customer_id),
        })
      }
    },
  })
}

/**
 * Delete a property (hard delete since properties are tied to addresses)
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ propertyId, customerId }: { propertyId: string; customerId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('properties')
        .update({ is_active: false })
        .eq('id', propertyId)

      if (error) throw new Error(error.message)
      return { propertyId, customerId }
    },
    onSuccess: ({ customerId }) => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.properties(workspace.tenantId, customerId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.customer(workspace.tenantId, customerId),
        })
      }
    },
  })
}

/**
 * Set a property as primary
 */
export function useSetPrimaryProperty() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async ({ propertyId, customerId }: { propertyId: string; customerId: string }) => {
      if (!workspace) throw new Error('No workspace selected')

      const supabase = createClient()

      // Unset all primaries for this customer
      await supabase
        .from('properties')
        .update({ is_primary: false })
        .eq('customer_id', customerId)
        .eq('tenant_id', workspace.tenantId)

      // Set the new primary
      const { error } = await supabase
        .from('properties')
        .update({ is_primary: true })
        .eq('id', propertyId)

      if (error) throw new Error(error.message)
      return { propertyId, customerId }
    },
    onSuccess: ({ customerId }) => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.properties(workspace.tenantId, customerId),
        })
      }
    },
  })
}
