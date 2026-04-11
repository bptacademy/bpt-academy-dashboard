-- =====================================================================
-- Migration: Sync Amateur division sessions with modules
-- 2026-04-10
--
-- Part 1 (Data fix):
--   - Remove orphan sessions (no module_id, not aligned to module dates)
--   - Create one program_session per module for each Amateur program
--   - Link each session to its module via module_id
--
-- Part 2 (Logic fix):
--   - Trigger: when attendance is marked as attended=true,
--     auto-complete the corresponding module in student_progress
-- =====================================================================

-- ── Part 1a: Remove orphan sessions for Amateur programs ─────────────────────
DELETE FROM program_sessions
WHERE program_id IN (
  SELECT id FROM programs WHERE division = 'amateur'
)
AND module_id IS NULL;

-- ── Part 1b: Insert sessions aligned to modules for Amateur programs ─────────
-- Each session is scheduled at 10:00 Europe/London time on the module's session_date
-- Title mirrors the module title, duration = 60 min

INSERT INTO program_sessions (program_id, title, description, scheduled_at, duration_minutes, location, module_id)
SELECT
  m.program_id,
  m.title,
  m.description,
  (m.session_date::text || ' 10:00:00')::timestamptz AT TIME ZONE 'Europe/London',
  60,
  NULL,
  m.id
FROM modules m
INNER JOIN programs p ON p.id = m.program_id
WHERE p.division = 'amateur'
-- Skip if a session for this module already exists
AND NOT EXISTS (
  SELECT 1 FROM program_sessions ps WHERE ps.module_id = m.id
);

-- ── Part 2: Trigger — attendance → auto-complete module in student_progress ──

-- Function: when a session_attendance row is inserted or updated with attended=true,
-- find the module linked to the session and mark it complete for that student.
CREATE OR REPLACE FUNCTION sync_module_completion_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Only act when attendance is marked as attended
  IF NEW.attended IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Find the module linked to this session
  SELECT module_id INTO v_module_id
  FROM program_sessions
  WHERE id = NEW.session_id;

  -- If no module linked, nothing to do
  IF v_module_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert student_progress: mark module as completed
  INSERT INTO student_progress (student_id, module_id, completed, completed_at)
  VALUES (NEW.student_id, v_module_id, true, now())
  ON CONFLICT (student_id, module_id)
  DO UPDATE SET
    completed    = true,
    completed_at = COALESCE(student_progress.completed_at, now());

  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_sync_module_on_attendance ON session_attendance;

CREATE TRIGGER trg_sync_module_on_attendance
  AFTER INSERT OR UPDATE OF attended
  ON session_attendance
  FOR EACH ROW
  EXECUTE FUNCTION sync_module_completion_on_attendance();
