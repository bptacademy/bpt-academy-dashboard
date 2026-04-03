-- ============================================================
-- Fix: RLS recursion between profiles and parent_access
-- ============================================================
-- The "Admins manage parent access" policy on parent_access
-- queries profiles, which re-triggers the profiles SELECT policy
-- "Parents can view their children", which queries parent_access
-- → infinite recursion → profile fetch fails → blank app.
--
-- Fix: use get_my_role() (SECURITY DEFINER, bypasses RLS)
-- instead of querying profiles directly.
-- ============================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins manage parent access" ON parent_access;

-- Recreate using get_my_role() to avoid recursion
CREATE POLICY "Admins manage parent access"
  ON parent_access FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'));
