-- =====================================================================
-- Availability-First Enrollment — Milestone 1
-- Public template layer + waitlist availability capture
-- 2026-06-18
--
-- ADDITIVE ONLY. Does NOT change programs' ownership of program_id, and
-- touches nothing in enrollments / promotion_cycles / session_attendance /
-- modules / student_progress. Safe to deploy BEFORE the app update — the
-- new table/columns are invisible to the running app.
-- =====================================================================

BEGIN;

-- ── 1. program_templates: one public catalog + waitlist entry per division+level
CREATE TABLE IF NOT EXISTS program_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division    division_type NOT NULL,
  skill_level skill_level,                 -- NULL for non-amateur divisions
  title       text NOT NULL,
  description text,
  price_gbp   decimal(10,2) DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- one template per (division, skill_level); NULL skill_level is its own bucket
CREATE UNIQUE INDEX IF NOT EXISTS program_templates_division_level_uniq
  ON program_templates (division, COALESCE(skill_level::text, ''));

CREATE TRIGGER program_templates_updated_at BEFORE UPDATE ON program_templates
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── 2. Link programs (now = child-programs / groups) up to a template
ALTER TABLE programs ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES program_templates(id);

-- ── 3. Backfill: a template per distinct (division, skill_level) in existing programs
INSERT INTO program_templates (division, skill_level, title, price_gbp)
SELECT
  p.division,
  p.skill_level,
  initcap(replace(p.division::text, '_', ' '))
    || CASE WHEN p.skill_level IS NOT NULL
            THEN ' · ' || initcap(p.skill_level::text) ELSE '' END,
  COALESCE(max(p.price_gbp), 0)
FROM programs p
WHERE p.division IS NOT NULL
GROUP BY p.division, p.skill_level
ON CONFLICT DO NOTHING;

-- Point every existing program at its template (duplicate listings collapse to one)
UPDATE programs p
SET template_id = t.id
FROM program_templates t
WHERE p.template_id IS NULL
  AND p.division = t.division
  AND COALESCE(p.skill_level::text, '') = COALESCE(t.skill_level::text, '');

-- ── 4. Waitlist capture columns (template link + availability/level/age/phone)
ALTER TABLE program_waiting_list
  ADD COLUMN IF NOT EXISTS template_id  uuid REFERENCES program_templates(id),
  ADD COLUMN IF NOT EXISTS availability jsonb,   -- {"tuesday":"morning","thursday":"afternoon"}
  ADD COLUMN IF NOT EXISTS level        skill_level,
  ADD COLUMN IF NOT EXISTS age          int,
  ADD COLUMN IF NOT EXISTS phone        text;

-- Backfill template_id for existing waitlisters (the ~12) from their program.
-- availability / level / age / phone stay NULL → Option A re-prompt fills them.
UPDATE program_waiting_list w
SET template_id = p.template_id
FROM programs p
WHERE w.template_id IS NULL AND w.program_id = p.id;

-- ── 5. Mandatory capture for NEW/updated rows only.
-- NOT VALID = existing 12 rows are NOT invalidated; the constraint is enforced
-- the moment a row is inserted or updated (i.e. when a student completes the
-- Option A prompt, all five fields must be present together).
ALTER TABLE program_waiting_list
  ADD CONSTRAINT waitlist_capture_complete
  CHECK (
    template_id  IS NOT NULL
    AND availability IS NOT NULL
    AND level    IS NOT NULL
    AND age      IS NOT NULL
    AND phone    IS NOT NULL
  ) NOT VALID;

-- ── 6. RLS for program_templates (mirrors programs / existing waitlist policies)
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON program_templates FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

CREATE POLICY "Coaches manage templates"
  ON program_templates FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('coach', 'admin', 'super_admin'));

-- ── 7. Indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_template ON program_waiting_list(template_id, joined_at);
CREATE INDEX IF NOT EXISTS idx_programs_template ON programs(template_id);

COMMIT;
