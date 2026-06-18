-- =====================================================================
-- Availability-First Enrollment — ranking-score matching
-- 2026-06-18
--
-- Adds a 1–7 ranking score to the waiting list and rebuilds the recommend
-- RPC to rank by availability AND level (score band), soft:
--   • scope widens to the whole DIVISION (so a group can see near-band players)
--   • in-band (score within the group's level band) ranks above out-of-band
--   • then full vs partial availability, then closeness to the band, then FIFO
-- Bands: beginner 1-2, intermediate 2-3, advanced 3-4 (amateur + juniors),
--        semi_pro 4-5, pro 5-7.
-- =====================================================================

BEGIN;

-- 1. Ranking score column (1–7) + range guard.
ALTER TABLE program_waiting_list
  ADD COLUMN IF NOT EXISTS ranking_score numeric;

ALTER TABLE program_waiting_list
  DROP CONSTRAINT IF EXISTS waitlist_ranking_score_range;
ALTER TABLE program_waiting_list
  ADD CONSTRAINT waitlist_ranking_score_range
  CHECK (ranking_score IS NULL OR (ranking_score >= 1 AND ranking_score <= 7)) NOT VALID;

-- Make the score mandatory for completed captures (NOT VALID → existing
-- pre-capture rows are untouched; enforced the moment a row is completed).
ALTER TABLE program_waiting_list
  DROP CONSTRAINT IF EXISTS waitlist_capture_complete;
ALTER TABLE program_waiting_list
  ADD CONSTRAINT waitlist_capture_complete CHECK (
    template_id   IS NOT NULL
    AND availability IS NOT NULL
    AND level     IS NOT NULL
    AND age       IS NOT NULL
    AND phone     IS NOT NULL
    AND ranking_score IS NOT NULL
  ) NOT VALID;

-- 2. Recommend RPC — availability + score-band, soft, division-wide.
-- Return signature changes (adds ranking_score + score_in_band), so drop first.
DROP FUNCTION IF EXISTS recommend_students_for_program(uuid);
CREATE OR REPLACE FUNCTION recommend_students_for_program(p_program_id uuid)
RETURNS TABLE (
  waitlist_id   uuid,
  student_id    uuid,
  full_name     text,
  level         skill_level,
  availability  jsonb,
  age           int,
  phone         text,
  ranking_score numeric,
  joined_at     timestamptz,
  waitlist_position int,
  match_type    text,    -- 'full' | 'partial' (availability)
  matched_days  int,
  required_days int,
  score_in_band boolean  -- ranking score inside this group's level band
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
  v_level       skill_level;
  v_division    text;
  v_bmin        numeric;
  v_bmax        numeric;
  v_slots       jsonb;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('coach', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized to recommend students';
  END IF;

  SELECT p.template_id, p.skill_level, p.division::text
    INTO v_template_id, v_level, v_division
  FROM programs p
  WHERE p.id = p_program_id;

  IF v_division IS NULL THEN
    RETURN;
  END IF;

  -- This group's score band.
  IF v_division = 'amateur' OR v_division LIKE 'junior%' THEN
    v_bmin := CASE v_level WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 ELSE 1 END;
    v_bmax := CASE v_level WHEN 'beginner' THEN 2 WHEN 'intermediate' THEN 3 WHEN 'advanced' THEN 4 ELSE 4 END;
  ELSIF v_division = 'semi_pro' THEN v_bmin := 4; v_bmax := 5;
  ELSIF v_division = 'pro'      THEN v_bmin := 5; v_bmax := 7;
  ELSE v_bmin := 1; v_bmax := 7;
  END IF;

  -- Program's required day→slot map from its latest schedule.
  SELECT jsonb_object_agg(
           d,
           CASE WHEN COALESCE(s.session_times ->> d, '09:00') < '12:00'
                THEN 'morning' ELSE 'afternoon' END
         )
    INTO v_slots
  FROM (
    SELECT days_of_week, session_times
    FROM program_schedules
    WHERE program_id = p_program_id
    ORDER BY start_date DESC NULLS LAST
    LIMIT 1
  ) s
  CROSS JOIN LATERAL unnest(s.days_of_week) AS d;

  IF v_slots IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      w.id, w.student_id, pr.full_name, w.level, w.availability,
      w.age, w.phone, w.ranking_score, w.joined_at, w.position,
      (SELECT count(*) FROM jsonb_each_text(v_slots) ps
         WHERE w.availability ->> ps.key = ps.value)::int AS matched,
      (SELECT count(*) FROM jsonb_object_keys(v_slots))::int AS required,
      (w.ranking_score IS NOT NULL AND w.ranking_score >= v_bmin AND w.ranking_score <= v_bmax) AS in_band,
      CASE WHEN w.ranking_score IS NULL          THEN 9999
           WHEN w.ranking_score < v_bmin         THEN v_bmin - w.ranking_score
           WHEN w.ranking_score > v_bmax         THEN w.ranking_score - v_bmax
           ELSE 0 END AS score_dist
    FROM program_waiting_list w
    JOIN profiles pr          ON pr.id = w.student_id
    JOIN program_templates t  ON t.id  = w.template_id
    WHERE t.division::text = v_division          -- whole division, all levels
      AND w.availability IS NOT NULL
      -- One active placement per division: skip anyone already placed.
      AND NOT EXISTS (
        SELECT 1
        FROM enrollments e
        JOIN programs sib ON sib.id = e.program_id
        WHERE e.student_id = w.student_id
          AND sib.division::text = v_division
          AND e.status IN ('active', 'pending_payment', 'pending_next_cycle')
      )
  )
  SELECT
    c.id, c.student_id, c.full_name, c.level, c.availability,
    c.age, c.phone, c.ranking_score, c.joined_at, c.position,
    CASE WHEN c.matched >= c.required THEN 'full' ELSE 'partial' END,
    c.matched, c.required, c.in_band
  FROM candidates c
  WHERE c.matched > 0
  ORDER BY c.in_band DESC, (c.matched >= c.required) DESC, c.matched DESC, c.score_dist ASC, c.joined_at ASC;
END;
$$;

COMMIT;
