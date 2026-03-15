'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'
import type { TenantRole, ActiveWorkspaceResult, SwitchWorkspaceResult } from '@/types/database'

export type WorkspaceContext = {
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: TenantRole
}

/**
 * Hook to get the current active workspace
 */
export function useActiveWorkspace() {
  return useQuery({
    queryKey: queryKeys.activeWorkspace(),
    queryFn: async (): Promise<WorkspaceContext | null> => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_active_workspace')

      if (error) {
        console.error('Failed to get active workspace:', error)
        return null
      }

      const result = data as ActiveWorkspaceResult

      if (!result.success) {
        return null
      }

      return {
        tenantId: result.tenant_id,
        tenantName: result.tenant_name,
        tenantSlug: result.tenant_slug,
        role: result.role,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })
}

/**
 * Hook to switch the active workspace
 */
export function useSwitchWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tenantId: string): Promise<WorkspaceContext> => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('switch_workspace', {
        p_tenant_id: tenantId,
      })

      if (error) {
        throw new Error(error.message)
      }

      const result = data as SwitchWorkspaceResult

      if (!result.success) {
        throw new Error(result.error)
      }

      // Fetch full workspace context
      const { data: workspace } = await supabase.rpc('get_active_workspace')
      const wsResult = workspace as ActiveWorkspaceResult

      if (!wsResult.success) {
        throw new Error(wsResult.error)
      }

      return {
        tenantId: wsResult.tenant_id,
        tenantName: wsResult.tenant_name,
        tenantSlug: wsResult.tenant_slug,
        role: wsResult.role,
      }
    },
    onSuccess: () => {
      // Invalidate all queries when workspace changes
      queryClient.invalidateQueries()
    },
  })
}

/**
 * Hook to get user's tenant memberships
 */
export function useUserMemberships() {
  return useQuery({
    queryKey: queryKeys.userMemberships(),
    queryFn: async () => {
      const supabase = createClient()
      const { data: memberships, error } = await supabase
        .from('tenant_memberships')
        .select(`
          *,
          tenant:tenants(*)
        `)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return memberships
    },
    staleTime: 1000 * 60 * 5,
  })
}
