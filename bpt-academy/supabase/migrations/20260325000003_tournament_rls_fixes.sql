-- Fix missing RLS policies for tournament_registrations and notifications

-- Admins/coaches can update tournament registrations (confirm, change status)
create policy "Admins can update registrations"
  on tournament_registrations for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach'))
  );

-- Students can update their own registration (withdraw)
create policy "Students can update own registrations"
  on tournament_registrations for update
  using (auth.uid() = student_id);

-- Authenticated users (students) can insert notifications (e.g. notify admins on free registration)
create policy "Students can insert notifications"
  on notifications for insert
  with check (auth.role() = 'authenticated');
