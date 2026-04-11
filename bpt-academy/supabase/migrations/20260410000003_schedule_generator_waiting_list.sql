-- =====================================================================
-- Migration: Monthly Schedule Generator + Waiting List system
-- 2026-04-10
-- =====================================================================

-- programs: add status column (active / pending / finished)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'pending', 'finished'));

-- program_waiting_list: per program + per month, FIFO
CREATE TABLE IF NOT EXISTS program_waiting_list (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month       TEXT NOT NULL, -- e.g. '2026-05'
  position    INT  NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, student_id, month)
);
ALTER TABLE program_waiting_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own waitlist"  ON program_waiting_list FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students join waitlist"      ON program_waiting_list FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students leave waitlist"     ON program_waiting_list FOR DELETE USING (auth.uid() = student_id);
CREATE POLICY "Coaches view all waitlist"   ON program_waiting_list FOR SELECT USING ((auth.jwt()->'app_metadata'->>'role') IN ('coach','admin','super_admin'));
CREATE POLICY "Coaches manage waitlist"     ON program_waiting_list FOR ALL USING ((auth.jwt()->'app_metadata'->>'role') IN ('coach','admin','super_admin'));

-- program_schedules: tracks month cycles per program
CREATE TABLE IF NOT EXISTS program_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  month        TEXT NOT NULL, -- e.g. '2026-05'
  start_date   DATE NOT NULL,
  days_of_week TEXT[] NOT NULL, -- e.g. ['monday','thursday']
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),
  UNIQUE(program_id, month)
);
ALTER TABLE program_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage schedules" ON program_schedules FOR ALL
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('coach','admin','super_admin'));

-- enrollments: re-enrollment confirmation fields
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS confirmed_next_month  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_confirmed     BOOLEAN DEFAULT FALSE;

-- Function: auto-flip programs to 'finished' when last session has passed
CREATE OR REPLACE FUNCTION auto_finish_program()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE programs SET status = 'finished'
  WHERE status = 'active'
    AND id NOT IN (
      SELECT DISTINCT program_id FROM program_sessions WHERE scheduled_at > NOW()
    );
END;
$$;
