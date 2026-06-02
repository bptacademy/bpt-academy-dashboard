-- ─── Skill Assessments ──────────────────────────────────────────────────────
-- Stores coach assessments of student skills.
-- performance_pct on promotion_cycles is derived from the most recent score
-- per skill within the active cycle (option C).

CREATE TABLE IF NOT EXISTS skill_assessments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  assessed_at   timestamptz NOT NULL DEFAULT now(),
  division      text NOT NULL,          -- level assessed at (beginner/intermediate/advanced/semi_pro/pro)
  skill_key     text NOT NULL,          -- e.g. 'forehand', 'backhand_off_glass'
  category      text NOT NULL,          -- 'technique' | 'tactic' | 'others'
  score         numeric(3,1) NOT NULL,  -- e.g. 3.5 — constrained to division range
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup per student
CREATE INDEX idx_skill_assessments_student ON skill_assessments(student_id, assessed_at DESC);
CREATE INDEX idx_skill_assessments_cycle   ON skill_assessments(student_id, skill_key, assessed_at DESC);

-- RLS
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;

-- Coaches/admins can INSERT and SELECT
CREATE POLICY "coaches can insert assessments"
  ON skill_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('coach', 'admin', 'super_admin')
  );

CREATE POLICY "coaches can update own assessments"
  ON skill_assessments FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "authenticated can read assessments"
  ON skill_assessments FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('coach', 'admin', 'super_admin')
  );

-- ─── Function: recalculate performance_pct on promotion_cycle ────────────────
-- Called after any insert/update on skill_assessments.
-- Uses most recent score per skill within the cycle window.
-- performance_pct = (avg of latest scores / max_score_for_level) * 100

CREATE OR REPLACE FUNCTION recalculate_performance_pct(p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cycle         record;
  v_division      text;
  v_max_score     numeric;
  v_avg_score     numeric;
  v_pct           integer;
BEGIN
  -- Get active cycle
  SELECT * INTO v_cycle
  FROM promotion_cycles
  WHERE student_id = p_student_id
    AND status IN ('active', 'eligible', 'approved')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- Get student division
  SELECT division INTO v_division FROM profiles WHERE id = p_student_id;

  -- Max score per division
  v_max_score := CASE v_division
    WHEN 'amateur' THEN 4.0  -- advanced ceiling (most generous for amateurs)
    WHEN 'semi_pro' THEN 5.0
    WHEN 'pro' THEN 5.0
    ELSE 4.0
  END;

  -- Average of the most recent score per skill within the cycle window
  SELECT AVG(latest_score) INTO v_avg_score
  FROM (
    SELECT DISTINCT ON (skill_key)
      score AS latest_score
    FROM skill_assessments
    WHERE student_id = p_student_id
      AND assessed_at >= v_cycle.cycle_start_date
    ORDER BY skill_key, assessed_at DESC
  ) latest_per_skill;

  IF v_avg_score IS NULL THEN RETURN; END IF;

  v_pct := LEAST(100, ROUND((v_avg_score / v_max_score) * 100));

  UPDATE promotion_cycles
  SET performance_pct = v_pct,
      last_evaluated_at = now()
  WHERE id = v_cycle.id;
END;
$$;

-- Trigger to auto-recalculate on insert/update
CREATE OR REPLACE FUNCTION trg_recalculate_performance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM recalculate_performance_pct(NEW.student_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_skill_assessment_perf
  AFTER INSERT OR UPDATE ON skill_assessments
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_performance();
