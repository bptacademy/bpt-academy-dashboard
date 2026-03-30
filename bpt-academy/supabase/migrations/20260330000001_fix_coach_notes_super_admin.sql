-- Fix coach_notes RLS to include super_admin for write operations

drop policy if exists "Coaches can write notes" on coach_notes;
drop policy if exists "Coaches can update own notes" on coach_notes;
drop policy if exists "Coaches can delete own notes" on coach_notes;

create policy "Coaches can write notes"
  on coach_notes for insert with check (
    auth.uid() = coach_id and
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Coaches can update own notes"
  on coach_notes for update using (
    auth.uid() = coach_id and
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Coaches can delete own notes"
  on coach_notes for delete using (
    auth.uid() = coach_id and
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );
