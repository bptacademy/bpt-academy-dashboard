-- =====================================================================
-- Dashboard Admin RLS Fix
-- Adds missing admin/coach/super_admin read policies to key tables.
-- Uses JWT claims directly (no get_my_role() call) to avoid recursion.
-- =====================================================================

-- Helper: is current user an admin or above?
-- We read from the JWT claim set by the handle_new_user trigger.
-- Falls back to querying profiles with SECURITY DEFINER to avoid recursion.

-- ── enrollments ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins see all enrollments" ON enrollments;
CREATE POLICY "Admins see all enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

DROP POLICY IF EXISTS "Admins manage enrollments" ON enrollments;
CREATE POLICY "Admins manage enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- ── payments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins see all payments" ON payments;
CREATE POLICY "Admins see all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

DROP POLICY IF EXISTS "Admins manage payments" ON payments;
CREATE POLICY "Admins manage payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- ── programs ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins see all programs" ON programs;
CREATE POLICY "Admins see all programs"
  ON programs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

DROP POLICY IF EXISTS "Admins manage programs" ON programs;
CREATE POLICY "Admins manage programs"
  ON programs FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- ── program_sessions ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins see all program_sessions" ON program_sessions;
CREATE POLICY "Admins see all program_sessions"
  ON program_sessions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

DROP POLICY IF EXISTS "Admins manage program_sessions" ON program_sessions;
CREATE POLICY "Admins manage program_sessions"
  ON program_sessions FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

-- ── tournaments ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage tournaments" ON tournaments;
CREATE POLICY "Admins manage tournaments"
  ON tournaments FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

-- ── tournament_registrations ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins see all tournament_registrations" ON tournament_registrations;
CREATE POLICY "Admins see all tournament_registrations"
  ON tournament_registrations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

DROP POLICY IF EXISTS "Admins manage tournament_registrations" ON tournament_registrations;
CREATE POLICY "Admins manage tournament_registrations"
  ON tournament_registrations FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

-- ── notifications ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins see all notifications" ON notifications;
CREATE POLICY "Admins see all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- ── session_attendance ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins see all attendance" ON session_attendance;
CREATE POLICY "Admins see all attendance"
  ON session_attendance FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

DROP POLICY IF EXISTS "Admins manage attendance" ON session_attendance;
CREATE POLICY "Admins manage attendance"
  ON session_attendance FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

-- ── profiles (ensure admins can see all) ─────────────────────────────────
DROP POLICY IF EXISTS "Admins see all profiles" ON profiles;
CREATE POLICY "Admins see all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

DROP POLICY IF EXISTS "Admins manage profiles" ON profiles;
CREATE POLICY "Admins manage profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );
