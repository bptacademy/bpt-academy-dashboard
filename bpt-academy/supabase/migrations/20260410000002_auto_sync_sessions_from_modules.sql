-- =====================================================================
-- Migration: Auto-create/update/delete program_sessions when modules change
-- 2026-04-10
--
-- Triggers on modules table:
--   - INSERT: auto-create a linked program_session
--   - UPDATE (session_date/title/description): sync the linked session
--   - UPDATE (session_date → NULL): delete the linked session
--
-- This means any new program (any division) with modules will
-- automatically get matching sessions, feeding the full chain:
-- module created → session created → attendance marked → module completed
-- → promotion cycle evaluated
-- =====================================================================

-- ── Trigger function: INSERT ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_create_session_for_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_date IS NOT NULL THEN
    INSERT INTO program_sessions (program_id, title, description, scheduled_at, duration_minutes, module_id)
    VALUES (
      NEW.program_id,
      NEW.title,
      NEW.description,
      (NEW.session_date::text || ' 10:00:00+01')::timestamptz,
      60,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_session_on_module ON modules;
CREATE TRIGGER trg_auto_session_on_module
  AFTER INSERT ON modules
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_session_for_module();

-- ── Trigger function: UPDATE ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_update_session_for_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_date IS NOT NULL THEN
    UPDATE program_sessions SET
      scheduled_at = (NEW.session_date::text || ' 10:00:00+01')::timestamptz,
      title        = NEW.title,
      description  = NEW.description
    WHERE module_id = NEW.id;
  ELSIF NEW.session_date IS NULL THEN
    DELETE FROM program_sessions WHERE module_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_update_session_on_module ON modules;
CREATE TRIGGER trg_auto_update_session_on_module
  AFTER UPDATE OF session_date, title, description ON modules
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_session_for_module();
