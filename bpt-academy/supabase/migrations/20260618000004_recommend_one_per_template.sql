-- =====================================================================
-- Availability-First Enrollment — Milestone 5 (guardrail)
-- recommend_students_for_program(): exclude students already placed in ANY
-- group under the same template (one active enrollment per level).
-- 2026-06-18
--
-- Only the NOT EXISTS guard changes vs M2: it now matches enrollments across
-- all sibling child-programs sharing this template_id, not just this program.
-- =====================================================================

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
  match_type    text,
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
  v_slots       jsonb;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('coach', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized to recommend students';
  END IF;

  SELECT p.template_id, p.skill_level
    INTO v_template_id, v_level
  FROM programs p
  WHERE p.id = p_program_id;

  IF v_template_id IS NULL THEN
    RETURN;
  END IF;

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
      w.age, w.phone, w.joined_at, w.position,
      (SELECT count(*) FROM jsonb_each_text(v_slots) ps
         WHERE w.availability ->> ps.key = ps.value)::int AS matched,
      (SELECT count(*) FROM jsonb_object_keys(v_slots))::int AS required
    FROM program_waiting_list w
    JOIN profiles pr ON pr.id = w.student_id
    WHERE w.template_id = v_template_id
      AND w.availability IS NOT NULL
      AND (v_level IS NULL OR w.level = v_level)
      -- One active placement per level: skip anyone already enrolled/pending in
      -- ANY group under this template, not just this program.
      AND NOT EXISTS (
        SELECT 1
        FROM enrollments e
        JOIN programs sib ON sib.id = e.program_id
        WHERE e.student_id = w.student_id
          AND sib.template_id = v_template_id
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
