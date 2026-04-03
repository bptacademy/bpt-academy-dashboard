-- ============================================================
-- Fix: get_my_role() recursion — use SET row_security = off
-- ============================================================
-- get_my_role() is SECURITY DEFINER (runs as postgres/superuser)
-- but still triggers RLS recursion when profiles policies call it
-- while profiles is being evaluated.
--
-- Fix: add SET row_security = off to the function definition.
-- This tells Postgres to skip RLS entirely when executing the
-- function body — safe because the function is SECURITY DEFINER
-- and owned by postgres (which has BYPASSRLS privilege).
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(role::text, 'student')
  FROM profiles
  WHERE id = auth.uid();
$$;

-- Also ensure get_my_children_ids() has row_security off
CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT student_id FROM parent_access WHERE parent_id = auth.uid();
$$;

-- Ensure is_admin_or_super() (created in 000003) also has it
CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(role::text, 'student') IN ('admin', 'super_admin')
  FROM profiles
  WHERE id = auth.uid();
$$;

-- Re-ensure the parents policy uses the safe function
DROP POLICY IF EXISTS "Parents can view their children" ON profiles;

CREATE POLICY "Parents can view their children"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT get_my_children_ids())
  );
