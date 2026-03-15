'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'

// ============================================================================
// Types
// ============================================================================

export type TenantLocation = {
  id: string
  tenant_id: string
  name: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  timezone: string
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  google_place_id: string | null
  is_primary: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ServiceAreaType = 'radius' | 'polygon' | 'zip_codes'
export type SurchargeType = 'flat' | 'percentage' | 'per_mile'

export type ServiceArea = {
  id: string
  tenant_id: string
  location_id: string
  name: string
  area_type: ServiceAreaType
  center_latitude: number | null
  center_longitude: number | null
  radius_miles: number | null
  polygon_coordinates: { lat: number; lng: number }[] | null
  zip_codes: string[] | null
  priority: number
  surcharge_type: SurchargeType | null
  surcharge_value: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LocationResolutionResult = {
  success: boolean
  in_service_area: boolean
  location_id: string | null
  location_name: string | null
  area_id: string | null
  area_name: string | null
  distance_miles: number | null
  surcharge_type: SurchargeType | null
  surcharge_value: number | null
  message?: string
}

// ============================================================================
// Location Queries
// ============================================================================

export function useLocations() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace ? queryKeys.locations(workspace.tenantId) : ['locations', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('tenant_locations' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as TenantLocation[]
    },
    enabled: !!workspace,
  })
}

export function useLocation(locationId: string | undefined) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace && locationId
      ? queryKeys.location(workspace.tenantId, locationId)
      : ['location', 'none'],
    queryFn: async () => {
      if (!workspace || !locationId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('tenant_locations' as never)
        .select('*')
        .eq('id', locationId)
        .eq('tenant_id', workspace.tenantId)
        .single()

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as TenantLocation
    },
    enabled: !!workspace && !!locationId,
  })
}

// ============================================================================
// Location Mutations
// ============================================================================

export function useUpsertLocation() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      name: string
      addressLine1?: string
      addressLine2?: string
      city?: string
      state?: string
      postalCode?: string
      country?: string
      timezone?: string
      phone?: string
      email?: string
      latitude?: number
      longitude?: number
      googlePlaceId?: string
      isPrimary?: boolean
      isActive?: boolean
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('upsert_tenant_location' as never, {
        p_location_id: input.id,
        p_name: input.name,
        p_address_line1: input.addressLine1,
        p_address_line2: input.addressLine2,
        p_city: input.city,
        p_state: input.state,
        p_postal_code: input.postalCode,
        p_country: input.country ?? 'US',
        p_timezone: input.timezone ?? 'America/New_York',
        p_phone: input.phone,
        p_email: input.email,
        p_latitude: input.latitude,
        p_longitude: input.longitude,
        p_google_place_id: input.googlePlaceId,
        p_is_primary: input.isPrimary ?? false,
        p_is_active: input.isActive ?? true,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; location_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to save location')

      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.locations(workspace.tenantId) })
      }
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (locationId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('delete_tenant_location' as never, {
        p_location_id: locationId,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to delete location')

      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.locations(workspace.tenantId) })
      }
    },
  })
}

export function useCanDeleteLocation() {
  return useMutation({
    mutationFn: async (locationId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('can_delete_location' as never, {
        p_location_id: locationId,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as { can_delete: boolean; reason?: string }
    },
  })
}

// ============================================================================
// Service Area Queries
// ============================================================================

export function useServiceAreas(locationId?: string) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? ['service-areas', workspace.tenantId, locationId ?? 'all']
      : ['service-areas', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      let query = supabase
        .from('service_areas' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)

      if (locationId) {
        query = query.eq('location_id', locationId)
      }

      const { data, error } = await query.order('priority', { ascending: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as ServiceArea[]
    },
    enabled: !!workspace,
  })
}

// ============================================================================
// Service Area Mutations
// ============================================================================

export function useUpsertServiceArea() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      locationId: string
      name: string
      areaType: ServiceAreaType
      centerLatitude?: number
      centerLongitude?: number
      radiusMiles?: number
      polygonCoordinates?: { lat: number; lng: number }[]
      zipCodes?: string[]
      priority?: number
      surchargeType?: SurchargeType
      surchargeValue?: number
      isActive?: boolean
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('upsert_service_area' as never, {
        p_area_id: input.id,
        p_location_id: input.locationId,
        p_name: input.name,
        p_area_type: input.areaType,
        p_center_latitude: input.centerLatitude,
        p_center_longitude: input.centerLongitude,
        p_radius_miles: input.radiusMiles,
        p_polygon_coordinates: input.polygonCoordinates ? JSON.stringify(input.polygonCoordinates) : null,
        p_zip_codes: input.zipCodes,
        p_priority: input.priority ?? 0,
        p_surcharge_type: input.surchargeType,
        p_surcharge_value: input.surchargeValue,
        p_is_active: input.isActive ?? true,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; area_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to save service area')

      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: ['service-areas', workspace.tenantId] })
      }
    },
  })
}

export function useDeleteServiceArea() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (areaId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('delete_service_area' as never, {
        p_area_id: areaId,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to delete service area')

      return result
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: ['service-areas', workspace.tenantId] })
      }
    },
  })
}

// ============================================================================
// Location Resolution
// ============================================================================

export function useResolvePropertyLocation() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      propertyId?: string
      latitude?: number
      longitude?: number
      zipCode?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('resolve_property_location' as never, {
        p_property_id: input.propertyId,
        p_latitude: input.latitude,
        p_longitude: input.longitude,
        p_zip_code: input.zipCode,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as LocationResolutionResult
      if (!result.success) throw new Error('Failed to resolve location')

      return result
    },
    onSuccess: (_, input) => {
      if (workspace && input.propertyId) {
        // Invalidate property queries since we may have updated assigned_location_id
        queryClient.invalidateQueries({ queryKey: ['properties', workspace.tenantId] })
      }
    },
  })
}
