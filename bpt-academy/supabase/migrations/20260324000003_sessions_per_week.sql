alter table programs
  add column if not exists sessions_per_week int default 2
  check (sessions_per_week >= 2 and sessions_per_week <= 4);
