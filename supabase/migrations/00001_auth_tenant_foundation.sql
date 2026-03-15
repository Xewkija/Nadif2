-- Auth + Tenant Foundation Migration
-- Creates the core tables for multi-tenant authentication:
-- - profiles: User profile data linked to auth.users
-- - tenants: Business/organization entities
-- - tenant_memberships: User-tenant relationships with roles

-- Create enum for tenant roles
CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'member');

-- Profiles table
-- Stores additional user data beyond what Supabase Auth provides
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenants table
-- Each tenant represents a cleaning business using Nadif
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on slug for fast lookups
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- Tenant memberships table
-- Links users to tenants with specific roles
CREATE TABLE tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role tenant_role NOT NULL DEFAULT 'member',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Each user can only have one membership per tenant
    UNIQUE(user_id, tenant_id)
);

-- Indexes for common queries
CREATE INDEX idx_tenant_memberships_user_id ON tenant_memberships(user_id);
CREATE INDEX idx_tenant_memberships_tenant_id ON tenant_memberships(tenant_id);
CREATE INDEX idx_tenant_memberships_user_default ON tenant_memberships(user_id, is_default) WHERE is_default = TRUE;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_memberships_updated_at
    BEFORE UPDATE ON tenant_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- Multi-tenant security: users can only access their own data and their tenant's data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Tenants policies
-- Users can view tenants they are members of
CREATE POLICY "Users can view their tenants"
    ON tenants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenant_memberships
            WHERE tenant_memberships.tenant_id = tenants.id
            AND tenant_memberships.user_id = auth.uid()
        )
    );

-- Only owners can update tenant details
CREATE POLICY "Owners can update tenant"
    ON tenants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tenant_memberships
            WHERE tenant_memberships.tenant_id = tenants.id
            AND tenant_memberships.user_id = auth.uid()
            AND tenant_memberships.role = 'owner'
        )
    );

-- Tenant memberships policies
-- Users can view memberships for tenants they belong to
CREATE POLICY "Users can view memberships of their tenants"
    ON tenant_memberships FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM tenant_memberships AS my_membership
            WHERE my_membership.tenant_id = tenant_memberships.tenant_id
            AND my_membership.user_id = auth.uid()
        )
    );

-- Users can update their own membership (for is_default toggle)
CREATE POLICY "Users can update own membership"
    ON tenant_memberships FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Owners and admins can insert memberships for their tenant
CREATE POLICY "Owners and admins can add members"
    ON tenant_memberships FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenant_memberships AS admin_membership
            WHERE admin_membership.tenant_id = tenant_memberships.tenant_id
            AND admin_membership.user_id = auth.uid()
            AND admin_membership.role IN ('owner', 'admin')
        )
    );

-- Owners can delete memberships (except their own if they're the only owner)
CREATE POLICY "Owners can remove members"
    ON tenant_memberships FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tenant_memberships AS owner_membership
            WHERE owner_membership.tenant_id = tenant_memberships.tenant_id
            AND owner_membership.user_id = auth.uid()
            AND owner_membership.role = 'owner'
        )
        AND NOT (
            user_id = auth.uid()
            AND role = 'owner'
            AND (
                SELECT COUNT(*) FROM tenant_memberships AS other_owners
                WHERE other_owners.tenant_id = tenant_memberships.tenant_id
                AND other_owners.role = 'owner'
            ) = 1
        )
    );

-- ============================================================================
-- HELPER FUNCTION: Ensure only one default membership per user
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_default_membership()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this membership as default, unset others
    IF NEW.is_default = TRUE THEN
        UPDATE tenant_memberships
        SET is_default = FALSE
        WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default
    BEFORE INSERT OR UPDATE OF is_default ON tenant_memberships
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE FUNCTION ensure_single_default_membership();

-- ============================================================================
-- COMMENT ON TABLES
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profile data, linked to Supabase auth.users';
COMMENT ON TABLE tenants IS 'Tenant/business entities in the multi-tenant system';
COMMENT ON TABLE tenant_memberships IS 'User-tenant relationships with role-based access';
COMMENT ON COLUMN tenant_memberships.is_default IS 'When true, this tenant is shown by default for the user';
