-- ─── Performance score: unscored skills default to 1 ────────────────────────
--
-- Previously: avg = mean of assessed skills only (ignoring unscored ones)
-- Now: avg = (sum of latest scores + 1 × unassessed_count) / total_skills_for_level
--
-- Total skill counts per effective level (from skillDefinitions.ts):
--   intermediate : 20 skills  (15 technique + 5 tactic)
--   advanced     : 33 skills  (22 technique + 11 tactic)
--   semi_pro/pro : 58 skills  (25 technique + 23 tactic + ... totals)
--
-- Applied: 2026-06-03

CREATE OR REPLACE FUNCTION recalculate_performance_pct(p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cycle          record;
  v_division       text;
  v_skill_lvl      text;
  v_target         numeric;
  v_total_skills   integer;
  v_assessed_count integer;
  v_sum_scores     numeric;
  v_avg_score      numeric;
  v_pct            integer;
BEGIN
  SELECT * INTO v_cycle
  FROM promotion_cycles
  WHERE student_id = p_student_id
    AND status NOT IN ('completed', 'promoted', 'rejected')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT division, skill_level INTO v_division, v_skill_lvl
  FROM profiles WHERE id = p_student_id;

  -- Promotion target score and total skill count per level
  -- Total counts match skillDefinitions.ts SKILLS array filtered by minLevel
  IF v_division = 'pro' OR v_division = 'semi_pro' THEN
    v_target       := 5.0;
    v_total_skills := 49;  -- semi_pro/pro skill set
  ELSIF v_division = 'amateur' AND v_skill_lvl = 'advanced' THEN
    v_target       := 4.0;
    v_total_skills := 33;  -- advanced skill set
  ELSIF v_division = 'amateur' AND v_skill_lvl = 'intermediate' THEN
    v_target       := 3.0;
    v_total_skills := 20;  -- intermediate skill set
  ELSE
    -- beginner / junior / unset → use intermediate skill set, target 2.0
    v_target       := 2.0;
    v_total_skills := 20;
  END IF;

  -- Sum of latest assessed scores within cycle window
  SELECT
    COUNT(DISTINCT skill_key),
    COALESCE(SUM(latest_score), 0)
  INTO v_assessed_count, v_sum_scores
  FROM (
    SELECT DISTINCT ON (skill_key)
      skill_key,
      score AS latest_score
    FROM skill_assessments
    WHERE student_id = p_student_id
      AND assessed_at >= v_cycle.cycle_start_date
    ORDER BY skill_key, assessed_at DESC
  ) t;

  -- If nothing in window, fall back to all-time
  IF v_assessed_count = 0 THEN
    SELECT
      COUNT(DISTINCT skill_key),
      COALESCE(SUM(latest_score), 0)
    INTO v_assessed_count, v_sum_scores
    FROM (
      SELECT DISTINCT ON (skill_key)
        skill_key,
        score AS latest_score
      FROM skill_assessments
      WHERE student_id = p_student_id
      ORDER BY skill_key, assessed_at DESC
    ) t;
  END IF;

  -- Still nothing — no assessments at all
  IF v_assessed_count = 0 THEN RETURN; END IF;

  -- Add 1.0 for each unassessed skill
  v_avg_score := (v_sum_scores + GREATEST(0, v_total_skills - v_assessed_count) * 1.0) / v_total_skills;

  v_pct := LEAST(100, ROUND((v_avg_score / v_target) * 100));

  UPDATE promotion_cycles
  SET performance_pct = v_pct, last_evaluated_at = now()
  WHERE id = v_cycle.id;
END;
$$;

-- Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT sa.student_id FROM skill_assessments sa
    JOIN promotion_cycles pc ON pc.student_id = sa.student_id
    WHERE pc.status NOT IN ('completed', 'promoted', 'rejected')
  LOOP
    PERFORM recalculate_performance_pct(r.student_id);
  END LOOP;
END;
$$;
