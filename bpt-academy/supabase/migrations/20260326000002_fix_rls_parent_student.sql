-- =============================================
-- Migration: Fix publicly accessible table
-- 2026-03-26
-- =============================================
-- Supabase warning: "Table publicly accessible —
-- RLS has not been enabled on tables in schemas
-- exposed to PostgREST"
--
-- Affected table: parent_student
-- This table was created in the initial schema
-- without RLS being enabled on it.
-- =============================================

alter table parent_student enable row level security;

-- Parents can see their own links
create policy "Parents see own links"
  on parent_student for select
  using (auth.uid() = parent_id);

-- Students can see who their parents are
create policy "Students see their parent links"
  on parent_student for select
  using (auth.uid() = student_id);

-- Only admins and super_admin can create/modify parent-student links
create policy "Admins manage parent-student links"
  on parent_student for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );
