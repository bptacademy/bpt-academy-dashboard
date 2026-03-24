-- Add email notification preference to profiles
alter table profiles
  add column if not exists email_notifications_enabled boolean default true;

-- Add 'email_sent' column to notifications to track email dispatch
alter table notifications
  add column if not exists email_sent boolean default false;

-- Allow admins to insert notifications for anyone
create policy if not exists "Admins can insert notifications"
  on notifications for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );

-- Allow admins to update notifications (e.g. mark email_sent)
create policy if not exists "Admins can update notifications"
  on notifications for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );

-- Allow users to mark own notifications as read
create policy if not exists "Users can update own notifications"
  on notifications for update
  using (auth.uid() = recipient_id);
