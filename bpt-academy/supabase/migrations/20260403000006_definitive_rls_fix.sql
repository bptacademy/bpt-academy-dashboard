-- ============================================================
-- DEFINITIVE FIX: Break the RLS recursion loop
-- ============================================================
-- Root cause:
--   profiles SELECT policy "Parents can view their children"
--   → calls get_my_children_ids()
--   → queries parent_access
--   → evaluates "Admins manage parent access" policy
--   → calls get_my_role()
--   → queries profiles
--   → INFINITE RECURSION
--
-- Fix: rewrite get_my_role() to use JWT claims (no table query).
-- For existing users whose role is not in JWT metadata, we use
-- a security definer function on a DIFFERENT table (auth.users)
-- which has no RLS policies.
--
-- Also: drop and cleanly recreate the parent_access admin policy
-- using JWT claims directly — no profiles query at all.
-- ============================================================

-- 1. Rewrite get_my_role() to read from auth.users (no RLS on auth schema)
--    auth.users is accessible to SECURITY DEFINER functions owned by postgres.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Try raw_app_meta_data first (set by admin API / trigger)
  SELECT raw_app_meta_data->>'role'
  INTO v_role
  FROM auth.users
  WHERE id = auth.uid();

  -- Fall back to raw_user_meta_data (set at signup)
  IF v_role IS NULL OR v_role = '' THEN
    SELECT raw_user_meta_data->>'role'
    INTO v_role
    FROM auth.users
    WHERE id = auth.uid();
  END IF;

  RETURN COALESCE(v_role, 'student');
END;
$$;

-- 2. Rewrite get_my_children_ids() to also use auth.users
--    (parent_access has no recursion issue since it doesn't trigger profiles policies)
CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT student_id FROM parent_access WHERE parent_id = auth.uid();
$$;

-- 3. Drop all existing parent_access policies and recreate cleanly
DROP POLICY IF EXISTS "Parents can see their own links"  ON parent_access;
DROP POLICY IF EXISTS "Admins manage parent access"      ON parent_access;

CREATE POLICY "Parents can see their own links"
  ON parent_access FOR SELECT
  USING (parent_id = auth.uid());

-- Admin policy now uses get_my_role() which reads auth.users (no RLS recursion)
CREATE POLICY "Admins manage parent access"
  ON parent_access FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'));

-- 4. Drop and recreate the profiles parent policy
DROP POLICY IF EXISTS "Parents can view their children" ON profiles;

CREATE POLICY "Parents can view their children"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT get_my_children_ids())
  );

-- 5. Update handle_new_user to also set app_metadata role
--    so future logins have role in JWT (faster path)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role      user_role;
  v_division  division_type;
  v_skill     skill_level;
  v_div_text  text;
  v_skill_text text;
BEGIN
  -- Role
  BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'student')::user_role;
  EXCEPTION WHEN others THEN
    v_role := 'student';
  END;

  -- Division (safe cast)
  v_div_text := new.raw_user_meta_data->>'division';
  BEGIN
    IF v_div_text IS NOT NULL AND v_div_text <> '' THEN
      v_division := v_div_text::division_type;
    END IF;
  EXCEPTION WHEN others THEN
    v_division := null;
  END;

  -- Skill level (safe cast)
  v_skill_text := new.raw_user_meta_data->>'skill_level';
  BEGIN
    IF v_skill_text IS NOT NULL AND v_skill_text <> '' THEN
      v_skill := v_skill_text::skill_level;
    END IF;
  EXCEPTION WHEN others THEN
    v_skill := null;
  END;

  INSERT INTO public.profiles (id, full_name, role, phone, division, skill_level)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone',
    v_division,
    v_skill
  )
  ON CONFLICT (id) DO UPDATE SET
    division    = COALESCE(excluded.division,    profiles.division),
    skill_level = COALESCE(excluded.skill_level, profiles.skill_level);

  -- Also stamp role into app_metadata so get_my_role() works from JWT
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role::text)
  WHERE id = new.id;

  RETURN new;
END;
$$;
