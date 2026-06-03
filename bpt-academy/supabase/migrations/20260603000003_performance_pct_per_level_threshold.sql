-- ─── Performance score: use per-level promotion thresholds ──────────────────
--
-- Previous formula: pct = (avg_score / 7.0) * 100, threshold = 80%
-- New formula:      pct = (avg_score / target_score) * 100, threshold = 100%
--
-- Promotion target scores (min avg to promote):
--   beginner     → intermediate : 2.0
--   intermediate → advanced     : 3.0
--   advanced     → semi_pro     : 4.0
--   semi_pro     → pro          : 5.0
--   pro          : 5.0 (top level)
--
-- This means performance_pct = 100 when student hits their target.
-- evaluate_promotion_cycle checks performance_pct >= 80, which corresponds to
-- hitting 80% of the way to their target — a generous "almost there" gate.
-- Full 100% = exactly at target → promotion eligible.
--
-- Applied: 2026-06-03

CREATE OR REPLACE FUNCTION recalculate_performance_pct(p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cycle      record;
  v_division   text;
  v_skill_lvl  text;
  v_target     numeric;
  v_avg_score  numeric;
  v_pct        integer;
BEGIN
  SELECT * INTO v_cycle
  FROM promotion_cycles
  WHERE student_id = p_student_id
    AND status NOT IN ('completed', 'promoted', 'rejected')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- Get student's division + skill_level to determine target score
  SELECT division, skill_level INTO v_division, v_skill_lvl
  FROM profiles WHERE id = p_student_id;

  v_target := CASE
    WHEN v_division = 'pro'                                      THEN 5.0
    WHEN v_division = 'semi_pro'                                 THEN 5.0
    WHEN v_division = 'amateur' AND v_skill_lvl = 'advanced'    THEN 4.0
    WHEN v_division = 'amateur' AND v_skill_lvl = 'intermediate' THEN 3.0
    ELSE 2.0  -- beginner / junior / unset → target 2.0
  END;

  -- Try assessments within the cycle window first
  SELECT AVG(latest_score) INTO v_avg_score
  FROM (
    SELECT DISTINCT ON (skill_key)
      score AS latest_score
    FROM skill_assessments
    WHERE student_id = p_student_id
      AND assessed_at >= v_cycle.cycle_start_date
    ORDER BY skill_key, assessed_at DESC
  ) latest_per_skill;

  -- Fallback: all-time latest per skill if none in window
  IF v_avg_score IS NULL THEN
    SELECT AVG(latest_score) INTO v_avg_score
    FROM (
      SELECT DISTINCT ON (skill_key)
        score AS latest_score
      FROM skill_assessments
      WHERE student_id = p_student_id
      ORDER BY skill_key, assessed_at DESC
    ) latest_per_skill;
  END IF;

  IF v_avg_score IS NULL THEN RETURN; END IF;

  -- pct = (avg / target) * 100, capped at 100
  -- 100% = student has hit their promotion target exactly
  v_pct := LEAST(100, ROUND((v_avg_score / v_target) * 100));

  UPDATE promotion_cycles
  SET performance_pct   = v_pct,
      last_evaluated_at = now()
  WHERE id = v_cycle.id;
END;
$$;

-- Backfill all students with active cycles
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT sa.student_id
    FROM skill_assessments sa
    JOIN promotion_cycles pc ON pc.student_id = sa.student_id
    WHERE pc.status NOT IN ('completed', 'promoted', 'rejected')
  LOOP
    PERFORM recalculate_performance_pct(r.student_id);
  END LOOP;
END;
$$;
