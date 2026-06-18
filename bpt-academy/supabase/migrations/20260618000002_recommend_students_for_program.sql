-- =====================================================================
-- Availability-First Enrollment — Milestone 2
-- recommend_students_for_program(): level + availability matching RPC
-- 2026-06-18
--
-- Read-only. Given a child-program (programs row, has template_id + a
-- schedule), returns the template's waitlisted students ranked by how well
-- their declared availability covers the program's day/slot pattern.
--
-- Match rule (LOCKED): a student is a FULL match when every one of the
-- program's (day + AM/PM) slots is covered by their availability; PARTIAL
-- when at least one aligns. Programs run 2 days/week Mon–Fri; AM/PM is
-- derived from the per-day session time (< 12:00 = morning, else afternoon).
--
-- Does NOT enroll anyone — assignment is Milestone 3.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION recommend_students_for_program(p_program_id uuid)
RETURNS TABLE (
  waitlist_id   uuid,
  student_id    uuid,
  full_name     text,
  level         skill_level,
  availability  jsonb,
  age           int,
  phone         text,
  joined_at     timestamptz,
  waitlist_position int,
  match_type    text,    -- 'full' | 'partial'
  matched_days  int,
  required_days int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
  v_level       skill_level;
  v_slots       jsonb;   -- {day: 'morning'|'afternoon'} the program requires
BEGIN
  -- Coach/admin only (mirrors the template RLS policy). NULL role (e.g. the
  -- Management API / service context) is allowed through for testing.
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('coach', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized to recommend students';
  END IF;

  -- 1. Program's template + level.
  SELECT p.template_id, p.skill_level
    INTO v_template_id, v_level
  FROM programs p
  WHERE p.id = p_program_id;

  IF v_template_id IS NULL THEN
    RETURN;  -- not a templated child-program; nothing to recommend
  END IF;

  -- 2. Program's required day→slot map from its latest schedule.
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
    RETURN;  -- no schedule yet — coach must set days/times before matching
  END IF;

  -- 3. Rank matching waitlisters on this template (all months — never filter by
  --    a stale `month`), by level + availability cover, excluding anyone already
  --    enrolled/pending in this program.
  RETURN QUERY
  WITH candidates AS (
    SELECT
      w.id, w.student_id, pr.full_name, w.level, w.availability,
      w.age, w.phone, w.joined_at, w.position,
      (SELECT count(*) FROM jsonb_each_text(v_slots) ps
         WHERE w.availability ->> ps.key = ps.value)::int AS matched,
      (SELECT count(*) FROM jsonb_object_keys(v_slots))::int AS required
    FROM program_waiting_list w
    JOIN profiles pr ON pr.id = w.student_id
    WHERE w.template_id = v_template_id
      AND w.availability IS NOT NULL
      AND (v_level IS NULL OR w.level = v_level)
      AND NOT EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.student_id = w.student_id
          AND e.program_id = p_program_id
          AND e.status IN ('active', 'pending_payment', 'pending_next_cycle')
      )
  )
  SELECT
    c.id, c.student_id, c.full_name, c.level, c.availability,
    c.age, c.phone, c.joined_at, c.position,
    CASE WHEN c.matched >= c.required THEN 'full' ELSE 'partial' END,
    c.matched, c.required
  FROM candidates c
  WHERE c.matched > 0
  ORDER BY (c.matched >= c.required) DESC, c.matched DESC, c.joined_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION recommend_students_for_program(uuid) TO authenticated;

COMMIT;
