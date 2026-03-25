-- Student development goals
create type goal_category as enum ('technical', 'tactical', 'physical', 'mindset');
create type goal_status as enum ('active', 'in_progress', 'achieved');

create table if not exists student_goals (
  id             uuid default gen_random_uuid() primary key,
  student_id     uuid not null references profiles(id) on delete cascade,
  coach_id       uuid not null references profiles(id) on delete cascade,
  category       goal_category not null,
  title          text not null,
  status         goal_status not null default 'active',
  achieved_at    timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table student_goals enable row level security;

-- Students can read their own goals
create policy "Students see own goals"
  on student_goals for select
  using (auth.uid() = student_id);

-- Coaches/admins can read all goals
create policy "Coaches see all goals"
  on student_goals for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach'))
  );

-- Coaches/admins can insert/update/delete
create policy "Coaches manage goals"
  on student_goals for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach'))
  );

-- Auto-update updated_at
create or replace function update_student_goals_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger student_goals_updated_at
  before update on student_goals
  for each row execute function update_student_goals_updated_at();
