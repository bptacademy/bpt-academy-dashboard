-- Allow programs with 1 training session per week.
-- Coaches/admins need a "1x / week" option on the Create Program screen.
--
-- Backward-compatible: only widens the allowed range (was 2–4, now 1–4).
-- Existing rows (all 2–4) remain valid; default stays 2. No data migration needed.

alter table public.programs
  drop constraint if exists programs_sessions_per_week_check;

alter table public.programs
  add constraint programs_sessions_per_week_check
  check (sessions_per_week >= 1 and sessions_per_week <= 4);
