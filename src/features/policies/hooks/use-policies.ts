'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'

// ============================================================================
// Types
// ============================================================================

// Deep Clean Policy
export type DeepCleanTriggerType =
  | 'days_since_last_deep'
  | 'cleanings_since_deep'
  | 'new_customer'
  | 'resume_after_pause'
  | 'property_change'
  | 'service_upgrade'

export type DeepCleanPolicy = {
  id: string
  tenant_id: string
  location_id: string | null
  trigger_type: DeepCleanTriggerType
  trigger_value: number | null
  is_enabled: boolean
  priority: number
  created_at: string
  updated_at: string
}

// Service Prerequisite Policy
export type PrerequisiteType =
  | 'previous_service'
  | 'deep_clean_first'
  | 'assessment_required'
  | 'minimum_cleanings'

export type ServicePrerequisitePolicy = {
  id: string
  tenant_id: string
  service_id: string
  prerequisite_type: PrerequisiteType
  prerequisite_service_id: string | null
  minimum_value: number | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// Access Policy
export type AccessPolicyType =
  | 'require_access_code'
  | 'require_key_on_file'
  | 'require_lockbox_code'
  | 'require_alarm_code'
  | 'require_pet_instructions'
  | 'require_parking_instructions'

export type AccessPolicy = {
  id: string
  tenant_id: string
  location_id: string | null
  policy_type: AccessPolicyType
  is_required: boolean
  warning_only: boolean
  applies_to_service_types: string[] | null
  created_at: string
  updated_at: string
}

// Approval Policy
export type ApprovalTriggerType =
  | 'discount_threshold'
  | 'booking_value_threshold'
  | 'refund_threshold'
  | 'new_customer_large_job'
  | 'manual_price_adjustment'
  | 'custom_service'

export type ApprovalPolicy = {
  id: string
  tenant_id: string
  location_id: string | null
  trigger_type: ApprovalTriggerType
  trigger_value: number | null
  requires_role: string
  auto_approve_for_roles: string[] | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// Bookability Policy
export type BookabilityPolicyType = 'always_quote' | 'always_instant' | 'conditional'

export type BookabilityPolicy = {
  id: string
  tenant_id: string
  location_id: string | null
  policy_type: BookabilityPolicyType
  applies_to_service_types: string[] | null
  conditions: Record<string, unknown> | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// Reclean Policy
export type RecleanPolicy = {
  id: string
  tenant_id: string
  location_id: string | null
  eligibility_window_hours: number
  max_recleans_per_booking: number
  requires_approval: boolean
  auto_approve_for_ratings_below: number | null
  auto_approve_for_customer_types: string[] | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Deep Clean Policies
// ============================================================================

export function useDeepCleanPolicies() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.policies(workspace.tenantId, 'deep-clean')
      : ['policies', 'deep-clean', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('deep_clean_policies' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('priority', { ascending: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as DeepCleanPolicy[]
    },
    enabled: !!workspace,
  })
}

export function useUpsertDeepCleanPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      locationId?: string
      triggerType: DeepCleanTriggerType
      triggerValue?: number
      isEnabled?: boolean
      priority?: number
    }) => {
      if (!workspace) throw new Error('No workspace')

      const supabase = createClient()

      if (input.id) {
        // Update existing
        const { data, error } = await supabase
          .from('deep_clean_policies' as never)
          .update({
            location_id: input.locationId,
            trigger_type: input.triggerType,
            trigger_value: input.triggerValue,
            is_enabled: input.isEnabled ?? true,
            priority: input.priority ?? 0,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', input.id)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as DeepCleanPolicy
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('deep_clean_policies' as never)
          .insert({
            tenant_id: workspace.tenantId,
            location_id: input.locationId,
            trigger_type: input.triggerType,
            trigger_value: input.triggerValue,
            is_enabled: input.isEnabled ?? true,
            priority: input.priority ?? 0,
          } as never)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as DeepCleanPolicy
      }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'deep-clean'),
        })
      }
    },
  })
}

export function useDeleteDeepCleanPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (policyId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('deep_clean_policies' as never)
        .delete()
        .eq('id', policyId)

      if (error) throw new Error((error as { message: string }).message)
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'deep-clean'),
        })
      }
    },
  })
}

// ============================================================================
// Service Prerequisite Policies
// ============================================================================

export function useServicePrerequisitePolicies(serviceId?: string) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.policies(workspace.tenantId, `prerequisites-${serviceId ?? 'all'}`)
      : ['policies', 'prerequisites', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      let query = supabase
        .from('service_prerequisite_policies' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)

      if (serviceId) {
        query = query.eq('service_id', serviceId)
      }

      const { data, error } = await query.order('created_at', { ascending: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as ServicePrerequisitePolicy[]
    },
    enabled: !!workspace,
  })
}

export function useUpsertServicePrerequisitePolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      serviceId: string
      prerequisiteType: PrerequisiteType
      prerequisiteServiceId?: string
      minimumValue?: number
      isEnabled?: boolean
    }) => {
      if (!workspace) throw new Error('No workspace')

      const supabase = createClient()

      if (input.id) {
        const { data, error } = await supabase
          .from('service_prerequisite_policies' as never)
          .update({
            service_id: input.serviceId,
            prerequisite_type: input.prerequisiteType,
            prerequisite_service_id: input.prerequisiteServiceId,
            minimum_value: input.minimumValue,
            is_enabled: input.isEnabled ?? true,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', input.id)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as ServicePrerequisitePolicy
      } else {
        const { data, error } = await supabase
          .from('service_prerequisite_policies' as never)
          .insert({
            tenant_id: workspace.tenantId,
            service_id: input.serviceId,
            prerequisite_type: input.prerequisiteType,
            prerequisite_service_id: input.prerequisiteServiceId,
            minimum_value: input.minimumValue,
            is_enabled: input.isEnabled ?? true,
          } as never)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as ServicePrerequisitePolicy
      }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: ['policies', workspace.tenantId],
        })
      }
    },
  })
}

export function useDeleteServicePrerequisitePolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (policyId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('service_prerequisite_policies' as never)
        .delete()
        .eq('id', policyId)

      if (error) throw new Error((error as { message: string }).message)
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: ['policies', workspace.tenantId],
        })
      }
    },
  })
}

// ============================================================================
// Access Policies
// ============================================================================

export function useAccessPolicies() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.policies(workspace.tenantId, 'access')
      : ['policies', 'access', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('access_policies' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('created_at', { ascending: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as AccessPolicy[]
    },
    enabled: !!workspace,
  })
}

export function useUpsertAccessPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      locationId?: string
      policyType: AccessPolicyType
      isRequired?: boolean
      warningOnly?: boolean
      appliesToServiceTypes?: string[]
    }) => {
      if (!workspace) throw new Error('No workspace')

      const supabase = createClient()

      if (input.id) {
        const { data, error } = await supabase
          .from('access_policies' as never)
          .update({
            location_id: input.locationId,
            policy_type: input.policyType,
            is_required: input.isRequired ?? true,
            warning_only: input.warningOnly ?? false,
            applies_to_service_types: input.appliesToServiceTypes,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', input.id)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as AccessPolicy
      } else {
        const { data, error } = await supabase
          .from('access_policies' as never)
          .insert({
            tenant_id: workspace.tenantId,
            location_id: input.locationId,
            policy_type: input.policyType,
            is_required: input.isRequired ?? true,
            warning_only: input.warningOnly ?? false,
            applies_to_service_types: input.appliesToServiceTypes,
          } as never)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as AccessPolicy
      }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'access'),
        })
      }
    },
  })
}

export function useDeleteAccessPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (policyId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('access_policies' as never)
        .delete()
        .eq('id', policyId)

      if (error) throw new Error((error as { message: string }).message)
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'access'),
        })
      }
    },
  })
}

// ============================================================================
// Approval Policies
// ============================================================================

export function useApprovalPolicies() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.policies(workspace.tenantId, 'approval')
      : ['policies', 'approval', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('approval_policies' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('created_at', { ascending: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as ApprovalPolicy[]
    },
    enabled: !!workspace,
  })
}

export function useUpsertApprovalPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      locationId?: string
      triggerType: ApprovalTriggerType
      triggerValue?: number
      requiresRole?: string
      autoApproveForRoles?: string[]
      isEnabled?: boolean
    }) => {
      if (!workspace) throw new Error('No workspace')

      const supabase = createClient()

      if (input.id) {
        const { data, error } = await supabase
          .from('approval_policies' as never)
          .update({
            location_id: input.locationId,
            trigger_type: input.triggerType,
            trigger_value: input.triggerValue,
            requires_role: input.requiresRole ?? 'manager',
            auto_approve_for_roles: input.autoApproveForRoles,
            is_enabled: input.isEnabled ?? true,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', input.id)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as ApprovalPolicy
      } else {
        const { data, error } = await supabase
          .from('approval_policies' as never)
          .insert({
            tenant_id: workspace.tenantId,
            location_id: input.locationId,
            trigger_type: input.triggerType,
            trigger_value: input.triggerValue,
            requires_role: input.requiresRole ?? 'manager',
            auto_approve_for_roles: input.autoApproveForRoles,
            is_enabled: input.isEnabled ?? true,
          } as never)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as ApprovalPolicy
      }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'approval'),
        })
      }
    },
  })
}

export function useDeleteApprovalPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (policyId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('approval_policies' as never)
        .delete()
        .eq('id', policyId)

      if (error) throw new Error((error as { message: string }).message)
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'approval'),
        })
      }
    },
  })
}

// ============================================================================
// Bookability Policies
// ============================================================================

export function useBookabilityPolicies() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.policies(workspace.tenantId, 'bookability')
      : ['policies', 'bookability', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookability_policies' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('created_at', { ascending: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as BookabilityPolicy[]
    },
    enabled: !!workspace,
  })
}

export function useUpsertBookabilityPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      locationId?: string
      policyType: BookabilityPolicyType
      appliesToServiceTypes?: string[]
      conditions?: Record<string, unknown>
      isEnabled?: boolean
    }) => {
      if (!workspace) throw new Error('No workspace')

      const supabase = createClient()

      if (input.id) {
        const { data, error } = await supabase
          .from('bookability_policies' as never)
          .update({
            location_id: input.locationId,
            policy_type: input.policyType,
            applies_to_service_types: input.appliesToServiceTypes,
            conditions: input.conditions,
            is_enabled: input.isEnabled ?? true,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', input.id)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as BookabilityPolicy
      } else {
        const { data, error } = await supabase
          .from('bookability_policies' as never)
          .insert({
            tenant_id: workspace.tenantId,
            location_id: input.locationId,
            policy_type: input.policyType,
            applies_to_service_types: input.appliesToServiceTypes,
            conditions: input.conditions,
            is_enabled: input.isEnabled ?? true,
          } as never)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as BookabilityPolicy
      }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'bookability'),
        })
      }
    },
  })
}

export function useDeleteBookabilityPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (policyId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('bookability_policies' as never)
        .delete()
        .eq('id', policyId)

      if (error) throw new Error((error as { message: string }).message)
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'bookability'),
        })
      }
    },
  })
}

// ============================================================================
// Reclean Policies
// ============================================================================

export function useRecleanPolicies() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.policies(workspace.tenantId, 'reclean')
      : ['policies', 'reclean', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('reclean_policies' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('created_at', { ascending: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as RecleanPolicy[]
    },
    enabled: !!workspace,
  })
}

export function useUpsertRecleanPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      id?: string
      locationId?: string
      eligibilityWindowHours?: number
      maxRecleansPerBooking?: number
      requiresApproval?: boolean
      autoApproveForRatingsBelow?: number
      autoApproveForCustomerTypes?: string[]
      isEnabled?: boolean
    }) => {
      if (!workspace) throw new Error('No workspace')

      const supabase = createClient()

      if (input.id) {
        const { data, error } = await supabase
          .from('reclean_policies' as never)
          .update({
            location_id: input.locationId,
            eligibility_window_hours: input.eligibilityWindowHours ?? 48,
            max_recleans_per_booking: input.maxRecleansPerBooking ?? 1,
            requires_approval: input.requiresApproval ?? true,
            auto_approve_for_ratings_below: input.autoApproveForRatingsBelow,
            auto_approve_for_customer_types: input.autoApproveForCustomerTypes,
            is_enabled: input.isEnabled ?? true,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', input.id)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as RecleanPolicy
      } else {
        const { data, error } = await supabase
          .from('reclean_policies' as never)
          .insert({
            tenant_id: workspace.tenantId,
            location_id: input.locationId,
            eligibility_window_hours: input.eligibilityWindowHours ?? 48,
            max_recleans_per_booking: input.maxRecleansPerBooking ?? 1,
            requires_approval: input.requiresApproval ?? true,
            auto_approve_for_ratings_below: input.autoApproveForRatingsBelow,
            auto_approve_for_customer_types: input.autoApproveForCustomerTypes,
            is_enabled: input.isEnabled ?? true,
          } as never)
          .select()
          .single()

        if (error) throw new Error((error as { message: string }).message)
        return data as unknown as RecleanPolicy
      }
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'reclean'),
        })
      }
    },
  })
}

export function useDeleteRecleanPolicy() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (policyId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('reclean_policies' as never)
        .delete()
        .eq('id', policyId)

      if (error) throw new Error((error as { message: string }).message)
    },
    onSuccess: () => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.policies(workspace.tenantId, 'reclean'),
        })
      }
    },
  })
}
