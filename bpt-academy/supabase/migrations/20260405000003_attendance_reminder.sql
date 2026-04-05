-- =====================================================================
-- Attendance Reminder: notify coaches when a session ends without
-- attendance being recorded. Called by session-reminders edge function.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_sessions_needing_attendance_reminder()
RETURNS TABLE(session_id UUID, program_title TEXT, coach_id UUID, session_time TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id AS session_id,
    p.title AS program_title,
    p.coach_id,
    ps.scheduled_at AS session_time
  FROM program_sessions ps
  JOIN programs p ON p.id = ps.program_id
  WHERE
    -- Session ended in the last 2 hours
    ps.scheduled_at + (COALESCE(ps.duration_minutes, 60) * INTERVAL '1 minute')
      BETWEEN NOW() - INTERVAL '2 hours' AND NOW()
    -- No attendance recorded yet
    AND NOT EXISTS (
      SELECT 1 FROM session_attendance sa WHERE sa.session_id = ps.id
    )
    -- Coach exists
    AND p.coach_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
