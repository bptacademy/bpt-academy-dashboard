-- ============================================================
-- Fix: infinite recursion in profiles RLS
-- ============================================================
-- The "Parents can view their children" policy on profiles
-- causes infinite recursion because:
--   profiles SELECT → parent_access → profiles SELECT → ...
--
-- Root fix: drop the recursive policy entirely and replace all
-- admin-check policies on parent_access with a security definer
-- function that reads from auth.jwt() (no table queries at all).
-- ============================================================

-- 1. Create a security definer function that checks role from
--    auth.users metadata — ZERO table queries, no RLS involved.
CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role',
    'student'
  ) IN ('admin', 'super_admin');
$$;

-- 2. Drop the broken recursive policy on profiles
DROP POLICY IF EXISTS "Parents can view their children" ON profiles;

-- 3. Recreate it using a security definer function to avoid recursion.
--    We need a separate function that queries parent_access without
--    triggering profiles RLS.
CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT student_id FROM parent_access WHERE parent_id = auth.uid();
$$;

CREATE POLICY "Parents can view their children"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT get_my_children_ids())
  );

-- 4. Fix parent_access admin policy to not query profiles
DROP POLICY IF EXISTS "Admins manage parent access" ON parent_access;

CREATE POLICY "Admins manage parent access"
  ON parent_access FOR ALL
  USING (is_admin_or_super());
