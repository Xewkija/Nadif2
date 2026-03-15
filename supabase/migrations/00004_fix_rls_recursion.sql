-- ============================================================================
-- Fix: RLS infinite recursion in tenant_memberships
-- The original policy queried tenant_memberships to check access, causing
-- infinite recursion. This simplifies to direct user_id check.
-- ============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view memberships of their tenants" ON tenant_memberships;

-- Create simple non-recursive policy: users can see their own memberships
CREATE POLICY "Users can view own memberships"
    ON tenant_memberships FOR SELECT
    USING (user_id = auth.uid());

-- For viewing OTHER members of a tenant (admin feature), we'll use a
-- SECURITY DEFINER function later. This keeps the basic flow working.

-- Also fix the tenants policy to use a SECURITY DEFINER function
-- to avoid recursion when checking membership

-- Create helper function that bypasses RLS to check membership
CREATE OR REPLACE FUNCTION user_has_tenant_access(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
  );
$$;

-- Drop and recreate tenants SELECT policy using the helper
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;

CREATE POLICY "Users can view their tenants"
    ON tenants FOR SELECT
    USING (user_has_tenant_access(id));

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION user_has_tenant_access(UUID) TO authenticated;
