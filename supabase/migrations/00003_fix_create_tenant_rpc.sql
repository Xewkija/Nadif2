-- ============================================================================
-- Fix: Ensure profile exists before creating tenant membership
-- The handle_new_user trigger should create profiles, but this provides
-- a safety net for users created before the trigger or if it failed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
    p_name TEXT,
    p_slug TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_tenant_id UUID;
    v_membership_id UUID;
    v_normalized_slug TEXT;
    v_has_membership BOOLEAN;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'not_authenticated',
            'message', 'You must be logged in to create a business'
        );
    END IF;

    -- Ensure profile exists (safety net for users without profile)
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

    INSERT INTO public.profiles (id, email)
    VALUES (v_user_id, v_user_email)
    ON CONFLICT (id) DO NOTHING;

    -- Check if user already has a tenant membership
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_memberships WHERE user_id = v_user_id
    ) INTO v_has_membership;

    IF v_has_membership THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'already_has_membership',
            'message', 'You already belong to a business'
        );
    END IF;

    -- Validate and normalize name
    IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_name',
            'message', 'Business name must be at least 2 characters'
        );
    END IF;

    -- Normalize slug: lowercase, trim
    v_normalized_slug := lower(trim(p_slug));

    -- Validate slug length
    IF v_normalized_slug IS NULL OR length(v_normalized_slug) < 3 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_slug',
            'message', 'URL slug must be at least 3 characters'
        );
    END IF;

    -- Validate slug format (lowercase alphanumeric with hyphens, no leading/trailing hyphens)
    IF v_normalized_slug !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_slug_format',
            'message', 'URL slug can only contain lowercase letters, numbers, and hyphens (no leading/trailing hyphens)'
        );
    END IF;

    -- Pre-check slug uniqueness for better UX (fast failure)
    IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_normalized_slug) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'slug_taken',
            'message', 'This URL slug is already taken. Please choose another.'
        );
    END IF;

    -- Create tenant and membership atomically
    -- Exception handling catches race conditions on unique constraint
    BEGIN
        -- Create tenant
        INSERT INTO public.tenants (name, slug)
        VALUES (trim(p_name), v_normalized_slug)
        RETURNING id INTO v_tenant_id;

        -- Create owner membership with is_default = true
        INSERT INTO public.tenant_memberships (user_id, tenant_id, role, is_default)
        VALUES (v_user_id, v_tenant_id, 'owner', true)
        RETURNING id INTO v_membership_id;

    EXCEPTION
        WHEN unique_violation THEN
            -- Race condition: another request created the same slug
            RETURN jsonb_build_object(
                'success', false,
                'error', 'slug_taken',
                'message', 'This URL slug is already taken. Please choose another.'
            );
    END;

    -- Return success with created IDs
    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'membership_id', v_membership_id,
        'name', trim(p_name),
        'slug', v_normalized_slug
    );
END;
$$;

COMMENT ON FUNCTION public.create_tenant_with_owner IS
'Creates a new tenant and owner membership for the calling user.
Ensures profile exists before creating membership (safety net).
Rejects if user already has any tenant membership (one business per user).
Handles concurrent slug conflicts via exception handling.
Returns structured JSON with success/error fields.';
