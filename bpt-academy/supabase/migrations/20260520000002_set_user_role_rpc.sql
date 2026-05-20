-- =============================================================================
-- set_user_role() RPC
-- Allows admins (and super_admins) to change a user's role.
-- Updates both profiles.role AND auth.users.raw_app_meta_data atomically
-- so the JWT claim is immediately in sync on next token refresh.
--
-- Guards:
--   - Only admin / super_admin callers
--   - Only valid role values
--   - Only super_admin can assign super_admin role
-- =============================================================================

CREATE OR REPLACE FUNCTION set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT get_my_role() INTO v_caller_role;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission denied: only admins and super_admins can change roles';
  END IF;

  IF p_role NOT IN ('student', 'coach', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Only super_admin can promote to super_admin
  IF p_role = 'super_admin' AND v_caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: only super_admins can assign super_admin role';
  END IF;

  -- Update profiles table
  UPDATE profiles
  SET role = p_role::user_role
  WHERE id = p_user_id;

  -- Sync app_metadata so JWT role claim updates on next token refresh
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role)
  WHERE id = p_user_id;
END;
$$;
