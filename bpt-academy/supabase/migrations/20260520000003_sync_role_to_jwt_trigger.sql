-- =============================================================================
-- Auto-sync profiles.role → auth.users.raw_app_meta_data on every role change
--
-- Fixes the drift problem where profiles.role and the JWT role claim get out
-- of sync (e.g. when role is set directly on profiles without going through
-- set_user_role()). This trigger fires on any UPDATE to profiles.role and
-- immediately stamps the new value into app_metadata.
--
-- Backfill (run once): fixes any existing mismatches
-- =============================================================================

-- Trigger function
CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', NEW.role::text)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_to_jwt ON profiles;
CREATE TRIGGER trg_sync_role_to_jwt
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_jwt();

-- Backfill: sync all users where jwt role != profile role
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', p.role::text)
FROM profiles p
WHERE p.id = u.id
  AND (u.raw_app_meta_data->>'role') IS DISTINCT FROM p.role::text;
