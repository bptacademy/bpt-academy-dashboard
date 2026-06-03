-- ─── Fix recalculate_performance_pct — always update, fallback to all-time ──
--
-- Previous version silently returned in two cases:
--   1. No active/eligible/approved cycle found (IF NOT FOUND THEN RETURN)
--   2. No assessments within the cycle date window (IF v_avg_score IS NULL THEN RETURN)
--
-- Fix:
--   1. Include ALL non-completed cycle statuses so newly-created cycles work
--   2. If no assessments fall within the cycle window, fall back to all-time
--      latest-per-skill scores (coach scored before cycle was created)
--   3. Never silently return without updating — if we have any scores, write them
--
-- Applied: 2026-06-03

CREATE OR REPLACE FUNCTION recalculate_performance_pct(p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cycle     record;
  v_avg_score numeric;
  v_pct       integer;
BEGIN
  -- Get the most recent non-completed cycle (any status except completed/promoted)
  SELECT * INTO v_cycle
  FROM promotion_cycles
  WHERE student_id = p_student_id
    AND status NOT IN ('completed', 'promoted', 'rejected')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

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

  -- Fallback: if no assessments in window, use all-time latest per skill
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

  -- Still nothing? Leave performance_pct as-is
  IF v_avg_score IS NULL THEN RETURN; END IF;

  -- Scale to 0–100 using absolute max of 7.0
  -- 80% promotion threshold = avg score of ~5.6/7
  v_pct := LEAST(100, ROUND((v_avg_score / 7.0) * 100));

  UPDATE promotion_cycles
  SET performance_pct   = v_pct,
      last_evaluated_at = now()
  WHERE id = v_cycle.id;
END;
$$;

-- Re-run for all students who have both skill assessments and a cycle,
-- so existing data is back-filled immediately after this migration runs.
DO $$
DECLARE
  r record;
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
