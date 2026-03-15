import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  Database,
  Profile,
  Tenant,
  TenantMembership,
  TenantRole,
  UserTenantContext,
  ActiveWorkspaceResult,
  SwitchWorkspaceResult,
} from '@/types/database'

/**
 * Creates a Supabase client for server-side operations in Server Components.
 * This client has access to the user's session via cookies.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

/**
 * Gets the current authenticated user or null.
 * Use this in Server Components to check auth state.
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Gets the current user's profile from the profiles table.
 */
export async function getProfile(): Promise<Profile | null> {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

// Type for the raw joined query result
type MembershipQueryResult = TenantMembership & {
  tenant: Tenant | null
}

/**
 * Gets the current user's default tenant membership with tenant details.
 * Returns the membership marked as default, or the first membership if none is default.
 */
export async function getCurrentTenantContext(): Promise<UserTenantContext | null> {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  // Get default membership with tenant
  const { data: membership } = await supabase
    .from('tenant_memberships')
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single()

  const typedMembership = membership as MembershipQueryResult | null

  // If no default, get first membership
  if (!typedMembership) {
    const { data: firstMembership } = await supabase
      .from('tenant_memberships')
      .select(`
        *,
        tenant:tenants(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const typedFirst = firstMembership as MembershipQueryResult | null

    if (!typedFirst || !typedFirst.tenant) return null

    return {
      profile,
      membership: { ...typedFirst, tenant: typedFirst.tenant },
      tenant: typedFirst.tenant,
    }
  }

  if (!typedMembership.tenant) return null

  return {
    profile,
    membership: { ...typedMembership, tenant: typedMembership.tenant },
    tenant: typedMembership.tenant,
  }
}

/**
 * Gets all tenant memberships for the current user.
 */
export async function getUserTenants() {
  const user = await getUser()
  if (!user) return []

  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from('tenant_memberships')
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  return (memberships ?? []) as unknown as MembershipQueryResult[]
}

// ============================================================================
// Workspace Security Functions
// ============================================================================

/**
 * Gets the current active workspace for the user.
 * Uses the server-side workspace session for multi-tenant isolation.
 */
export async function getActiveWorkspace(): Promise<{
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: TenantRole
} | null> {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_active_workspace')

  if (error || !data) {
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
}

/**
 * Switches the user's active workspace.
 * This changes which tenant's data the user can access.
 */
export async function switchWorkspace(tenantId: string): Promise<{
  success: boolean
  error?: string
  role?: TenantRole
}> {
  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('switch_workspace', {
    p_tenant_id: tenantId,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data as SwitchWorkspaceResult

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, role: result.role }
}

/**
 * Ensures user has an active workspace session.
 * If no session exists, automatically sets the default/first tenant.
 * Call this after login to ensure workspace is set.
 */
export async function ensureActiveWorkspace(): Promise<{
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: TenantRole
} | null> {
  // First try to get existing workspace
  const existing = await getActiveWorkspace()
  if (existing) {
    return existing
  }

  // No active workspace, get user's memberships
  const memberships = await getUserTenants()
  if (memberships.length === 0) {
    return null // No memberships = needs onboarding
  }

  // Find default membership or first one
  const defaultMembership = memberships.find(m => m.is_default) ?? memberships[0]

  if (!defaultMembership.tenant) {
    return null
  }

  // Switch to this workspace
  const result = await switchWorkspace(defaultMembership.tenant_id)

  if (!result.success) {
    return null
  }

  return {
    tenantId: defaultMembership.tenant_id,
    tenantName: defaultMembership.tenant.name,
    tenantSlug: defaultMembership.tenant.slug,
    role: defaultMembership.role,
  }
}
