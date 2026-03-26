-- =============================================
-- Migration: super_admin RLS policies + role fn
-- 2026-03-26
-- =============================================
-- Depends on 20260326000001 (enum add) being
-- committed first. Updates every RLS policy to
-- include super_admin, and adds assign_user_role().
-- =============================================

-- ── profiles ──────────────────────────────────────────────────
drop policy if exists "Coaches can update any profile" on profiles;
create policy "Coaches can update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

create policy "Super admins can delete profiles"
  on profiles for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'super_admin'
    )
  );

-- ── programs ──────────────────────────────────────────────────
drop policy if exists "Coaches can insert programs" on programs;
drop policy if exists "Coaches can update programs" on programs;
drop policy if exists "Coaches can delete programs" on programs;

create policy "Coaches can insert programs"
  on programs for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

create policy "Coaches can update programs"
  on programs for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

create policy "Coaches can delete programs"
  on programs for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

-- ── program_sessions ──────────────────────────────────────────
drop policy if exists "Coaches can manage program sessions" on program_sessions;
drop policy if exists "Coaches can update program sessions" on program_sessions;

create policy "Coaches can manage program sessions"
  on program_sessions for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update program sessions"
  on program_sessions for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

-- ── modules ───────────────────────────────────────────────────
drop policy if exists "Coaches can manage modules" on modules;
drop policy if exists "Coaches can update modules" on modules;
drop policy if exists "Coaches can delete modules" on modules;

create policy "Coaches can manage modules"
  on modules for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update modules"
  on modules for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can delete modules"
  on modules for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

-- ── videos ────────────────────────────────────────────────────
drop policy if exists "Coaches can insert videos" on videos;
drop policy if exists "Coaches can update videos" on videos;

create policy "Coaches can insert videos"
  on videos for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update videos"
  on videos for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Admins can delete videos"
  on videos for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

-- ── enrollments ───────────────────────────────────────────────
drop policy if exists "Coaches can view all enrollments" on enrollments;
drop policy if exists "Coaches can update enrollments" on enrollments;

create policy "Coaches can view all enrollments"
  on enrollments for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update enrollments"
  on enrollments for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Admins can delete enrollments"
  on enrollments for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

-- ── student_progress ──────────────────────────────────────────
drop policy if exists "Coaches can view all progress" on student_progress;
drop policy if exists "Coaches can update student progress" on student_progress;

create policy "Coaches can view all progress"
  on student_progress for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update student progress"
  on student_progress for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

-- ── notifications ─────────────────────────────────────────────
drop policy if exists "Coaches can send notifications" on notifications;

create policy "Coaches can send notifications"
  on notifications for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

-- ── payments ──────────────────────────────────────────────────
drop policy if exists "Admins see all payments" on payments;
drop policy if exists "Admins can update payments" on payments;

create policy "Admins see all payments"
  on payments for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Admins can update payments"
  on payments for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── tournaments ───────────────────────────────────────────────
drop policy if exists "Admins manage tournaments" on tournaments;

create policy "Admins manage tournaments"
  on tournaments for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── tournament_registrations ──────────────────────────────────
drop policy if exists "Admins see all registrations" on tournament_registrations;

create policy "Admins see all registrations"
  on tournament_registrations for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── tournament_matches ────────────────────────────────────────
drop policy if exists "Admins manage matches" on tournament_matches;

create policy "Admins manage matches"
  on tournament_matches for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── courts ────────────────────────────────────────────────────
drop policy if exists "Admins manage courts" on courts;

create policy "Admins manage courts"
  on courts for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── court_bookings ────────────────────────────────────────────
drop policy if exists "Admins see all bookings" on court_bookings;

create policy "Admins see all bookings"
  on court_bookings for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── session_attendance ────────────────────────────────────────
drop policy if exists "Admins see all attendance" on session_attendance;
drop policy if exists "Admins can mark attendance" on session_attendance;

create policy "Admins see all attendance"
  on session_attendance for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Admins can mark attendance"
  on session_attendance for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── coach_notes ───────────────────────────────────────────────
drop policy if exists "Admins/coaches see all notes" on coach_notes;

create policy "Admins/coaches see all notes"
  on coach_notes for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── ranking_events ────────────────────────────────────────────
drop policy if exists "Admins manage rankings" on ranking_events;

create policy "Admins manage rankings"
  on ranking_events for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── academy_settings ──────────────────────────────────────────
drop policy if exists "Admins can update settings" on academy_settings;

-- Coaches intentionally excluded from settings management
create policy "Admins can update settings"
  on academy_settings for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- ── program_coaches ───────────────────────────────────────────
drop policy if exists "Admins can manage program coaches" on program_coaches;

create policy "Admins can manage program coaches"
  on program_coaches for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'coach', 'super_admin')
    )
  );

-- ── promotion_cycles ──────────────────────────────────────────
drop policy if exists "Admins see all cycles" on promotion_cycles;
drop policy if exists "Admins manage cycles" on promotion_cycles;

create policy "Admins see all cycles"
  on promotion_cycles for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Admins manage cycles"
  on promotion_cycles for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── student_goals ─────────────────────────────────────────────
drop policy if exists "Coaches see all goals" on student_goals;
drop policy if exists "Coaches manage goals" on student_goals;

create policy "Coaches see all goals"
  on student_goals for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Coaches manage goals"
  on student_goals for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- =============================================
-- assign_user_role() — super_admin only
-- =============================================
create or replace function assign_user_role(
  target_user_id uuid,
  new_role user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'super_admin'
  ) then
    raise exception 'Only super_admin can assign roles';
  end if;

  if new_role != 'super_admin' then
    if (select count(*) from profiles where role = 'super_admin') <= 1
       and (select role from profiles where id = target_user_id) = 'super_admin' then
      raise exception 'Cannot remove the last super_admin';
    end if;
  end if;

  update profiles set role = new_role where id = target_user_id;
end;
$$;
