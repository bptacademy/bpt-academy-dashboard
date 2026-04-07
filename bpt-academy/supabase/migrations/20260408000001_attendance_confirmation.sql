-- =====================================================================
-- Weekly Attendance Confirmation System
-- Students confirm attendance for next week's sessions every Wednesday.
-- Responses can be changed until Saturday 9pm of the same week.
-- =====================================================================

CREATE TABLE IF NOT EXISTS attendance_confirmations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES program_sessions(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('confirmed', 'declined', 'maybe', 'pending')),
  responded_at      TIMESTAMPTZ,
  -- Deadline: Saturday 9pm of the same week as the session
  editable_until    TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE attendance_confirmations ENABLE ROW LEVEL SECURITY;

-- Students can view and update their own confirmations
CREATE POLICY "Students view own confirmations"
  ON attendance_confirmations FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students insert own confirmations"
  ON attendance_confirmations FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own confirmations before deadline"
  ON attendance_confirmations FOR UPDATE
  USING (auth.uid() = student_id AND NOW() < editable_until)
  WITH CHECK (auth.uid() = student_id AND NOW() < editable_until);

-- Coaches and admins can view all confirmations
CREATE POLICY "Coaches view all confirmations"
  ON attendance_confirmations FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('coach', 'admin', 'super_admin')
  );

-- Function: calculate editable_until = Saturday 9pm of the session's week (UTC)
CREATE OR REPLACE FUNCTION get_confirmation_deadline(session_date TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  dow INT;
  days_to_saturday INT;
  saturday DATE;
BEGIN
  -- day of week: 0=Sun, 1=Mon ... 6=Sat
  dow := EXTRACT(DOW FROM session_date AT TIME ZONE 'Europe/London')::INT;
  days_to_saturday := (6 - dow + 7) % 7;
  -- If today IS Saturday, deadline is today at 21:00
  IF days_to_saturday = 0 THEN days_to_saturday := 0; END IF;
  saturday := (session_date AT TIME ZONE 'Europe/London')::DATE + days_to_saturday;
  RETURN (saturday || ' 21:00:00')::TIMESTAMPTZ AT TIME ZONE 'Europe/London';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function called by edge function: returns all active students + upcoming sessions for this week
CREATE OR REPLACE FUNCTION get_weekly_confirmation_targets()
RETURNS TABLE(
  student_id    UUID,
  session_id    UUID,
  program_title TEXT,
  session_time  TIMESTAMPTZ,
  editable_until TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.student_id,
    ps.id AS session_id,
    p.title AS program_title,
    ps.scheduled_at AS session_time,
    get_confirmation_deadline(ps.scheduled_at) AS editable_until
  FROM enrollments e
  JOIN programs p ON p.id = e.program_id
  JOIN program_sessions ps ON ps.program_id = p.id
  WHERE
    e.status = 'active'
    -- Sessions in the next 7 days (Mon–Sun of coming week)
    AND ps.scheduled_at >= NOW()
    AND ps.scheduled_at < NOW() + INTERVAL '7 days'
    -- Skip sessions already confirmed/declined
    AND NOT EXISTS (
      SELECT 1 FROM attendance_confirmations ac
      WHERE ac.session_id = ps.id AND ac.student_id = e.student_id
      AND ac.status != 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
