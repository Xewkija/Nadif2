-- ============================================================================
-- Workspace Security Model
-- Phase 1A: Database Foundation
-- Server-enforced active workspace for multi-tenant isolation
-- ============================================================================

-- User workspace sessions table
-- Tracks which tenant each user is currently working in
-- This is the security boundary - RLS uses this to scope all queries
CREATE TABLE user_workspace_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  switched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_workspace_sessions_tenant ON user_workspace_sessions(active_tenant_id);

-- Enable RLS
ALTER TABLE user_workspace_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own workspace session
CREATE POLICY "Users can view own workspace session"
  ON user_workspace_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own workspace session"
  ON user_workspace_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own workspace session"
  ON user_workspace_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Membership validation trigger
-- Ensures user can only set active workspace to a tenant they're a member of
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_workspace_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_memberships.user_id = NEW.user_id
    AND tenant_memberships.tenant_id = NEW.active_tenant_id
  ) THEN
    RAISE EXCEPTION 'User does not have active membership to this tenant';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_workspace_membership
  BEFORE INSERT OR UPDATE ON user_workspace_sessions
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_membership();

-- ============================================================================
-- Core helper function for RLS
-- Returns the current user's active tenant ID
-- All tenant-scoped RLS policies use this function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_tenant_id()
RETURNS UUID AS $$
  SELECT active_tenant_id
  FROM user_workspace_sessions
  WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_active_tenant_id() TO authenticated;

-- ============================================================================
-- Workspace switch RPC
-- Safe way to change active tenant with membership validation
-- ============================================================================

CREATE OR REPLACE FUNCTION switch_workspace(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_membership_role tenant_role;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check membership and get role
  SELECT role INTO v_membership_role
  FROM tenant_memberships
  WHERE user_id = v_user_id
  AND tenant_id = p_tenant_id;

  IF v_membership_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this tenant');
  END IF;

  -- Upsert active workspace
  INSERT INTO user_workspace_sessions (user_id, active_tenant_id, switched_at)
  VALUES (v_user_id, p_tenant_id, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET active_tenant_id = p_tenant_id, switched_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'role', v_membership_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION switch_workspace(UUID) TO authenticated;

-- ============================================================================
-- Get active workspace RPC
-- Returns current tenant context including role
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_workspace()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'tenant_id', ws.active_tenant_id,
    'tenant_name', t.name,
    'tenant_slug', t.slug,
    'role', tm.role
  ) INTO v_result
  FROM user_workspace_sessions ws
  JOIN tenants t ON t.id = ws.active_tenant_id
  JOIN tenant_memberships tm ON tm.tenant_id = ws.active_tenant_id AND tm.user_id = v_user_id
  WHERE ws.user_id = v_user_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_active_workspace() TO authenticated;

-- ============================================================================
-- Auto-create workspace session on first membership
-- When a user gets their first tenant membership, auto-set it as active
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_workspace_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if user doesn't have an active workspace yet
  INSERT INTO user_workspace_sessions (user_id, active_tenant_id, switched_at)
  VALUES (NEW.user_id, NEW.tenant_id, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_workspace_on_membership
  AFTER INSERT ON tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION auto_create_workspace_session();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_workspace_sessions IS 'Server-side active tenant for each user. Security boundary for RLS.';
COMMENT ON FUNCTION get_active_tenant_id() IS 'Returns current users active tenant. Used in all tenant-scoped RLS policies.';
COMMENT ON FUNCTION switch_workspace(UUID) IS 'RPC to change active workspace. Validates membership.';
COMMENT ON FUNCTION get_active_workspace() IS 'RPC to get current workspace context including role.';
