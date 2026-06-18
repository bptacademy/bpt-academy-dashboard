-- =====================================================================
-- Availability-First Enrollment — Milestone 4 (cycle hardening)
-- activate_pending_cycle_enrollments(): catch-up activation
-- 2026-06-18
--
-- PART A change ONLY: activate pending_next_cycle students when the cycle
-- start date is `<= CURRENT_DATE` (was `= CURRENT_DATE`). This un-strands
-- students if a cron run is missed or a date is set in the past. PART B
-- (end-date completion) is unchanged.
--
-- Pre-deploy audit (programs with next_cycle_start_date <= today AND
-- pending_next_cycle students) returned 0 rows, so the first run after this
-- change activates nobody unexpectedly.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.activate_pending_cycle_enrollments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  prog RECORD;
  enr  RECORD;
BEGIN
  -- PART A — activate students whose next cycle has arrived (or already passed).
  FOR prog IN
    SELECT id, next_cycle_start_date
    FROM programs
    WHERE next_cycle_start_date <= CURRENT_DATE   -- was: = CURRENT_DATE
      AND status = 'active'
  LOOP
    UPDATE enrollments
    SET status = 'active', enrolled_at = now()
    WHERE program_id = prog.id AND status = 'pending_next_cycle';

    INSERT INTO notifications (recipient_id, title, body, type, data)
    SELECT e.student_id, '🎾 Your program has started!',
           'Your sessions are now live. Welcome to the new cycle — let''s go!',
           'enrollment',
           jsonb_build_object('program_id', prog.id, 'cycle_start', prog.next_cycle_start_date)
    FROM enrollments e
    WHERE e.program_id = prog.id
      AND e.status = 'active'
      AND e.enrolled_at::date = CURRENT_DATE;

    UPDATE programs
    SET current_cycle_start_date = next_cycle_start_date,
        next_cycle_start_date = NULL
    WHERE id = prog.id;
  END LOOP;

  -- PART B — complete programs whose end_date has passed (unchanged).
  FOR prog IN
    SELECT id, title, end_date
    FROM programs
    WHERE end_date IS NOT NULL AND end_date < CURRENT_DATE AND status = 'active'
  LOOP
    FOR enr IN
      SELECT id, student_id FROM enrollments
      WHERE program_id = prog.id AND status = 'active'
    LOOP
      UPDATE enrollments SET status = 'completed' WHERE id = enr.id;
      INSERT INTO notifications (recipient_id, title, body, type, data)
      VALUES (enr.student_id, '🏁 Program Complete!',
              'Your ' || COALESCE(prog.title, 'program') || ' has ended. Great work! You can now browse and join a new program.',
              'enrollment',
              jsonb_build_object('program_id', prog.id, 'ended_on', prog.end_date));
    END LOOP;
    UPDATE programs SET is_active = false WHERE id = prog.id;
  END LOOP;
END;
$function$;
