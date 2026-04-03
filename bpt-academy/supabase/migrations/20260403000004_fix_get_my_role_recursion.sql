-- ============================================================
-- Fix: get_my_role() causes infinite recursion
-- ============================================================
-- get_my_role() queries profiles table directly, which triggers
-- profiles RLS policies, which call get_my_role() → infinite loop.
--
-- Fix: rewrite get_my_role() to read from auth.users metadata
-- (JWT claims) — zero table queries, no RLS involved.
--
-- Also: drop the "Parents can view their children" policy entirely
-- for now — it's the policy that introduced the recursion.
-- Parents can still be re-added safely later once the base RLS
-- is stable.
-- ============================================================

-- 1. Fix get_my_role() to use JWT claims instead of querying profiles
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role',
    'student'
  );
$$;

-- 2. Drop ALL problematic policies on profiles that reference profiles
--    (the recursive ones)
DROP POLICY IF EXISTS "Parents can view their children" ON profiles;
DROP POLICY IF EXISTS "Admins manage parent access" ON parent_access;
DROP POLICY IF EXISTS "Parents can see their own links" ON parent_access;

-- 3. Recreate parent_access policies cleanly (no profiles queries)
CREATE POLICY "Parents can see their own links"
  ON parent_access FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Admins manage parent access"
  ON parent_access FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'));

-- 4. Recreate parents-view-children policy using security definer
--    function that bypasses RLS on parent_access
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
