-- Link sessions to modules so attendance drives progress
alter table program_sessions
  add column if not exists module_id uuid references modules(id) on delete set null;
