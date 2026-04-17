-- ─────────────────────────────────────────────────────────────────────────────
-- Enrollment Cycles: pending_payment, pending_next_cycle, auto-activation
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add new enrollment statuses to the enum
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'pending_next_cycle';

-- 2. Add cycle date columns to programs
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS current_cycle_start_date date,
  ADD COLUMN IF NOT EXISTS next_cycle_start_date date;

-- 3. Backfill existing active programs: set current_cycle_start_date to created_at date
UPDATE programs
SET current_cycle_start_date = created_at::date
WHERE current_cycle_start_date IS NULL AND status = 'active';

-- 4. Function: activate pending_next_cycle enrollments when their program's next_cycle_start_date arrives
CREATE OR REPLACE FUNCTION activate_pending_cycle_enrollments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prog RECORD;
BEGIN
  -- Find programs whose next cycle starts today
  FOR prog IN
    SELECT id, next_cycle_start_date
    FROM programs
    WHERE next_cycle_start_date = CURRENT_DATE
      AND status = 'active'
  LOOP
    -- Flip pending_next_cycle → active for all students in this program
    UPDATE enrollments
    SET status = 'active',
        enrolled_at = now()
    WHERE program_id = prog.id
      AND status = 'pending_next_cycle';

    -- Notify each student whose enrollment just activated
    INSERT INTO notifications (recipient_id, title, body, type, data)
    SELECT
      e.student_id,
      '🎾 Your program has started!',
      'Your sessions are now live. Welcome to the new cycle — let''s go!',
      'enrollment',
      jsonb_build_object(
        'program_id', prog.id,
        'cycle_start', prog.next_cycle_start_date
      )
    FROM enrollments e
    WHERE e.program_id = prog.id
      AND e.status = 'active'
      AND e.enrolled_at::date = CURRENT_DATE;

    -- Roll cycle dates: current → today, next → null (coach sets next one)
    UPDATE programs
    SET current_cycle_start_date = next_cycle_start_date,
        next_cycle_start_date = NULL
    WHERE id = prog.id;

  END LOOP;
END;
$$;

-- 5. Schedule via pg_cron: run every day at 00:01 UTC
SELECT cron.schedule(
  'activate-pending-cycle-enrollments',
  '1 0 * * *',
  'SELECT activate_pending_cycle_enrollments();'
);

-- 6. Helper function: can a student see sessions for a program?
-- Returns true only if enrollment is active (not pending)
CREATE OR REPLACE FUNCTION student_can_see_sessions(p_student_id uuid, p_program_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE student_id = p_student_id
      AND program_id = p_program_id
      AND status = 'active'
  );
$$;

-- 7. RLS policy: students can only see program_sessions for programs they are ACTIVELY enrolled in
-- (pending_next_cycle students see program info but not current sessions)
DROP POLICY IF EXISTS "Students see own program sessions" ON program_sessions;
CREATE POLICY "Students see own program sessions"
  ON program_sessions FOR SELECT
  USING (
    -- Coaches, admins, super_admins see everything
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('coach', 'admin', 'super_admin')
    OR
    -- Active students see sessions for their active enrollments only
    student_can_see_sessions(auth.uid(), program_id)
  );
