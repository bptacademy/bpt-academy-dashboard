-- =============================================================================
-- Program End Date + Enrollment Auto-Expiry
--
-- 1. Add end_date to programs (auto-computed, coach can override)
-- 2. Backfill end_date for existing programs
-- 3. Trigger: keep end_date in sync when cycle dates or duration changes
-- 4. Extend activate_pending_cycle_enrollments() to also expire finished programs
-- 5. Notify students when their enrollment is auto-completed
-- =============================================================================

-- ─── 1. Add end_date column to programs ──────────────────────────────────────

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS end_date date;

-- ─── 2. Backfill end_date for existing active programs ───────────────────────
-- Use current_cycle_start_date + duration_weeks * 7 days
-- Only backfill where we have enough data and end_date not already set

UPDATE programs
SET end_date = (current_cycle_start_date + (duration_weeks * 7) * INTERVAL '1 day')::date
WHERE end_date IS NULL
  AND current_cycle_start_date IS NOT NULL
  AND duration_weeks IS NOT NULL;

-- ─── 3. Trigger: auto-update end_date when cycle start or duration changes ───

CREATE OR REPLACE FUNCTION sync_program_end_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recompute if coach hasn't manually set an end_date AFTER our computation
  -- Rule: if end_date was previously computed (= old cycle start + old duration),
  -- recompute it. If coach manually set a different value, leave it alone.
  -- Simple approach: always recompute if both inputs are present.
  IF NEW.current_cycle_start_date IS NOT NULL AND NEW.duration_weeks IS NOT NULL THEN
    -- Only overwrite if end_date is null OR it equals the old computed value
    IF OLD.end_date IS NULL
       OR OLD.end_date = (OLD.current_cycle_start_date + (OLD.duration_weeks * 7) * INTERVAL '1 day')::date
    THEN
      NEW.end_date := (NEW.current_cycle_start_date + (NEW.duration_weeks * 7) * INTERVAL '1 day')::date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_program_end_date ON programs;
CREATE TRIGGER trg_sync_program_end_date
  BEFORE UPDATE OF current_cycle_start_date, duration_weeks ON programs
  FOR EACH ROW
  EXECUTE FUNCTION sync_program_end_date();

-- ─── 4. Extend the daily cron function to expire finished enrollments ─────────

CREATE OR REPLACE FUNCTION activate_pending_cycle_enrollments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prog RECORD;
  enr  RECORD;
BEGIN

  -- ── PART A: Activate pending_next_cycle enrollments (existing logic) ─────

  FOR prog IN
    SELECT id, next_cycle_start_date
    FROM programs
    WHERE next_cycle_start_date = CURRENT_DATE
      AND status = 'active'
  LOOP
    UPDATE enrollments
    SET status = 'active',
        enrolled_at = now()
    WHERE program_id = prog.id
      AND status = 'pending_next_cycle';

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

    UPDATE programs
    SET current_cycle_start_date = next_cycle_start_date,
        next_cycle_start_date = NULL
    WHERE id = prog.id;

  END LOOP;

  -- ── PART B: Auto-expire enrollments for programs whose end_date has passed ─

  FOR prog IN
    SELECT id, title, end_date
    FROM programs
    WHERE end_date IS NOT NULL
      AND end_date < CURRENT_DATE
      AND status = 'active'
  LOOP
    -- Mark each active enrollment as completed and notify the student
    FOR enr IN
      SELECT id, student_id
      FROM enrollments
      WHERE program_id = prog.id
        AND status = 'active'
    LOOP
      UPDATE enrollments
      SET status = 'completed'
      WHERE id = enr.id;

      -- Notify student: program ended, they can now join a new one
      INSERT INTO notifications (recipient_id, title, body, type, data)
      VALUES (
        enr.student_id,
        '🏁 Program Complete!',
        'Your ' || COALESCE(prog.title, 'program') || ' has ended. Great work! You can now browse and join a new program.',
        'enrollment',
        jsonb_build_object(
          'program_id', prog.id,
          'ended_on', prog.end_date
        )
      );
    END LOOP;

    -- Mark the program itself as inactive so it no longer shows in the listings
    UPDATE programs
    SET is_active = false
    WHERE id = prog.id;

  END LOOP;

END;
$$;

-- ─── 5. Function: coach/admin can manually end a cycle early ─────────────────
-- Called from the dashboard or app. Sets end_date = today, expires enrollments,
-- notifies students, marks program inactive.

CREATE OR REPLACE FUNCTION end_program_cycle(p_program_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title TEXT;
  enr     RECORD;
BEGIN
  SELECT title INTO v_title FROM programs WHERE id = p_program_id;

  -- Mark enrollments as completed
  FOR enr IN
    SELECT id, student_id
    FROM enrollments
    WHERE program_id = p_program_id
      AND status = 'active'
  LOOP
    UPDATE enrollments SET status = 'completed' WHERE id = enr.id;

    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      enr.student_id,
      '🏁 Program Complete!',
      'Your ' || COALESCE(v_title, 'program') || ' has ended. Great work! You can now browse and join a new program.',
      'enrollment',
      jsonb_build_object('program_id', p_program_id)
    );
  END LOOP;

  -- Set end_date to today and mark inactive
  UPDATE programs
  SET end_date  = CURRENT_DATE,
      is_active = false
  WHERE id = p_program_id;

END;
$$;
