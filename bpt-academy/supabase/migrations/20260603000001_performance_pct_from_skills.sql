-- ─── Performance score: skills assessments own performance_pct (Option A) ────
--
-- Previously evaluate_promotion_cycle() called get_performance_pct() which
-- read student_progress.score (module-level scores). This overwrote the
-- skills-based performance_pct calculated by recalculate_performance_pct()
-- on every attendance event.
--
-- Fix: evaluate_promotion_cycle() no longer touches performance_pct.
-- The skills trigger (trg_skill_assessment_perf) is the sole owner of that
-- column. evaluate_promotion_cycle() reads the current value from the cycle
-- row and uses it for eligibility — it does not overwrite it.
--
-- Applied: 2026-06-03

-- ── Step 1: Replace evaluate_promotion_cycle (original from promotion_engine)
CREATE OR REPLACE FUNCTION evaluate_promotion_cycle(p_cycle_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cycle        promotion_cycles%ROWTYPE;
  v_active_weeks int;
  v_att_pct      int;
  v_perf_pct     int;
  v_program_id   uuid;
BEGIN
  SELECT * INTO v_cycle FROM promotion_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_cycle.status NOT IN ('active', 'eligible') THEN RETURN; END IF;

  -- Resolve program
  v_program_id := v_cycle.program_id;
  IF v_program_id IS NULL THEN
    SELECT program_id INTO v_program_id
    FROM enrollments
    WHERE student_id = v_cycle.student_id
      AND status = 'active'
    ORDER BY enrolled_at DESC
    LIMIT 1;
  END IF;

  IF v_program_id IS NULL THEN RETURN; END IF;

  -- Calculate attendance metrics only
  v_active_weeks := get_active_weeks(v_cycle.student_id, v_program_id, v_cycle.cycle_start_date);
  v_att_pct      := get_attendance_pct(v_cycle.student_id, v_program_id, v_cycle.cycle_start_date);

  -- Read current skills-based performance_pct from the cycle row
  -- (kept fresh by trg_skill_assessment_perf — do NOT overwrite it here)
  v_perf_pct := v_cycle.performance_pct;

  -- Update attendance metrics only; leave performance_pct untouched
  UPDATE promotion_cycles SET
    active_weeks_so_far = v_active_weeks,
    attendance_pct      = v_att_pct,
    last_evaluated_at   = now(),
    program_id          = v_program_id
  WHERE id = p_cycle_id;

  -- Eligibility check: all three criteria must be met
  IF v_active_weeks >= v_cycle.min_active_weeks
  AND v_att_pct     >= v_cycle.required_attendance_pct
  AND v_perf_pct    >= 80
  AND v_cycle.status = 'active'
  THEN
    UPDATE promotion_cycles SET status = 'eligible' WHERE id = p_cycle_id;
    INSERT INTO notifications (recipient_id, title, body, type)
    VALUES (
      v_cycle.student_id,
      '⭐ You''re eligible for promotion!',
      'You''ve hit the attendance and performance targets. Your coach will review and approve your promotion soon.',
      'promotion'
    );
  END IF;

  -- Revert to active if criteria no longer met
  IF (v_active_weeks < v_cycle.min_active_weeks
   OR v_att_pct      < v_cycle.required_attendance_pct
   OR v_perf_pct     < 80)
  AND v_cycle.status = 'eligible'
  THEN
    UPDATE promotion_cycles SET status = 'active' WHERE id = p_cycle_id;
  END IF;
END;
$$;

-- ── Step 2: Also fix recalculate_performance_pct to use correct max scores ────
-- The original used a rough division-level max. We use the MIN_PASSING_SCORE
-- ceiling per level to produce a 0–100 scale that maps naturally:
--   score = min_pass       → ~57–71% (amber zone, not yet at 80%)
--   score = min_pass + 1   → ~71–86% (green, at or above 80%)
--   score = 7.0 (max)      → 100%
--
-- Formula: pct = LEAST(100, ROUND((avg_score / 7.0) * 100))
-- This uses the absolute max (7.0) so a student scoring 7s in everything = 100%.
-- The 80% promotion threshold maps to an average score of ~5.6/7.

CREATE OR REPLACE FUNCTION recalculate_performance_pct(p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cycle     record;
  v_avg_score numeric;
  v_pct       integer;
BEGIN
  -- Get active/eligible cycle
  SELECT * INTO v_cycle
  FROM promotion_cycles
  WHERE student_id = p_student_id
    AND status IN ('active', 'eligible', 'approved')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

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

  -- Scale to 0–100 using absolute max score of 7.0
  v_pct := LEAST(100, ROUND((v_avg_score / 7.0) * 100));

  UPDATE promotion_cycles
  SET performance_pct   = v_pct,
      last_evaluated_at = now()
  WHERE id = v_cycle.id;
END;
$$;
