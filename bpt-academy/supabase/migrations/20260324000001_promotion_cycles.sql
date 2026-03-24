-- Promotion cycles: tracks each student's active promotion window
create table if not exists promotion_cycles (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  from_level text not null,
  to_level text not null,
  cycle_start_date date not null,
  cycle_end_date date not null,
  required_attendance_pct int not null default 80,
  requires_coach_approval boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'eligible', 'approved', 'promoted', 'expired')),
  coach_approved_by uuid references profiles(id),
  coach_approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table promotion_cycles enable row level security;

create policy "Students see own cycles"
  on promotion_cycles for select using (auth.uid() = student_id);

create policy "Admins see all cycles"
  on promotion_cycles for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );

create policy "Admins manage cycles"
  on promotion_cycles for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );
