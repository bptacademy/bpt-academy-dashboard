-- =====================================================================
-- Waiting-list level is Amateur-only
-- 2026-06-22
--
-- The skill level (beginner/intermediate/advanced) only applies to the Amateur
-- division — Semi-Pro and Pro have no sub-levels. The completeness CHECK
-- required level for every row, forcing Semi-Pro/Pro joiners to pick a
-- meaningless level. Drop `level` from the CHECK; the app still requires it for
-- Amateur and passes null for Semi-Pro/Pro.
-- =====================================================================

alter table public.program_waiting_list drop constraint if exists waitlist_capture_complete;

alter table public.program_waiting_list
  add constraint waitlist_capture_complete
  check (
    template_id   is not null and
    availability  is not null and
    age           is not null and
    phone         is not null and
    ranking_score is not null
  ) not valid;
