-- ─── Session times per day of week ───────────────────────────────────────────
-- Adds session_times JSONB to program_schedules so each day of week can have
-- its own time. e.g. {"monday":"18:00","wednesday":"10:00","friday":"18:30"}
--
-- Also adds a helper function to update future session scheduled_at times
-- when a coach changes the time mid-program (without regenerating the schedule).
--
-- Applied: 2026-06-04

ALTER TABLE program_schedules
  ADD COLUMN IF NOT EXISTS session_times JSONB DEFAULT '{}'::jsonb;

-- ── Function: update_future_session_times ────────────────────────────────────
-- Updates scheduled_at for all FUTURE sessions in a program, per day of week.
-- Past sessions (scheduled_at < NOW()) are never touched.
-- p_session_times: {"monday":"18:00","wednesday":"10:30"}
CREATE OR REPLACE FUNCTION update_future_session_times(
  p_program_id  uuid,
  p_session_times jsonb
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r           record;
  v_day_name  text;
  v_time_str  text;
  v_new_at    timestamptz;
  v_count     integer := 0;
BEGIN
  -- Only touch sessions in the future
  FOR r IN
    SELECT id, scheduled_at
    FROM program_sessions
    WHERE program_id = p_program_id
      AND scheduled_at > NOW()
  LOOP
    -- Get day name (lowercase) for this session
    v_day_name := lower(to_char(r.scheduled_at AT TIME ZONE 'Europe/London', 'Day'));
    v_day_name := trim(v_day_name);

    -- Check if we have a new time for this day
    v_time_str := p_session_times ->> v_day_name;
    IF v_time_str IS NOT NULL THEN
      -- Rebuild scheduled_at: keep the date, apply new time in Europe/London
      v_new_at := (
        date_trunc('day', r.scheduled_at AT TIME ZONE 'Europe/London')
        + v_time_str::interval
      ) AT TIME ZONE 'Europe/London';

      UPDATE program_sessions
      SET scheduled_at = v_new_at
      WHERE id = r.id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Also update program_schedules session_times for this program
  UPDATE program_schedules
  SET session_times = p_session_times
  WHERE program_id = p_program_id
  ORDER BY generated_at DESC
  LIMIT 1;

  RETURN v_count;
END;
$$;

-- RLS: coaches/admins can call this function (SECURITY DEFINER handles it)
GRANT EXECUTE ON FUNCTION update_future_session_times(uuid, jsonb) TO authenticated;
