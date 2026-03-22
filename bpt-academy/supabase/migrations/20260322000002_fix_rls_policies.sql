-- =============================================
-- Fix RLS policies for coach/admin roles
-- =============================================

-- Programs: coaches and admins can insert/update/delete
create policy "Coaches can insert programs"
  on programs for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin')
    )
  );

create policy "Coaches can update programs"
  on programs for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin')
    )
  );

create policy "Coaches can delete programs"
  on programs for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin')
    )
  );

-- Program sessions: coaches and admins can manage
create policy "Anyone authenticated can view program sessions"
  on program_sessions for select using (auth.role() = 'authenticated');

create policy "Coaches can manage program sessions"
  on program_sessions for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

create policy "Coaches can update program sessions"
  on program_sessions for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- Modules: coaches and admins can manage
create policy "Anyone authenticated can view modules"
  on modules for select using (auth.role() = 'authenticated');

create policy "Coaches can manage modules"
  on modules for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

create policy "Coaches can update modules"
  on modules for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

create policy "Coaches can delete modules"
  on modules for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- Videos: coaches and admins can insert/update
create policy "Coaches can insert videos"
  on videos for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

create policy "Coaches can update videos"
  on videos for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- Enrollments: coaches and admins can view and manage all
create policy "Coaches can view all enrollments"
  on enrollments for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

create policy "Coaches can update enrollments"
  on enrollments for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- Student progress: coaches and admins can view all
create policy "Coaches can view all progress"
  on student_progress for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

create policy "Coaches can update student progress"
  on student_progress for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- Notifications: coaches and admins can insert (for announcements)
create policy "Coaches can send notifications"
  on notifications for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- Profiles: coaches and admins can view and update all profiles
create policy "Coaches can update any profile"
  on profiles for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );
