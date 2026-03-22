-- Many-to-many: programs ↔ coaches
create table if not exists program_coaches (
  program_id uuid references programs(id) on delete cascade,
  coach_id   uuid references profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (program_id, coach_id)
);

alter table program_coaches enable row level security;

-- Anyone authenticated can read (needed for student-facing program detail)
create policy "Anyone can read program coaches"
  on program_coaches for select
  using (auth.role() = 'authenticated');

-- Only admins/coaches can assign
create policy "Admins can manage program coaches"
  on program_coaches for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'coach')
    )
  );

-- Migrate existing coach_id → program_coaches
insert into program_coaches (program_id, coach_id)
select id, coach_id from programs
where coach_id is not null
on conflict do nothing;
