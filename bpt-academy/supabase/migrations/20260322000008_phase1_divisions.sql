-- =============================================
-- Phase 1: Divisions, Tournaments, Payments,
--           Attendance, Coach Notes, Rankings,
--           Court Bookings
-- =============================================

-- ── Division types ────────────────────────────────────────────
create type division_type as enum (
  'amateur',
  'semi_pro',
  'pro',
  'junior_9_11',
  'junior_12_15',
  'junior_15_18'
);

-- ── Update profiles ────────────────────────────────────────────
alter table profiles
  add column if not exists division division_type,
  add column if not exists ranking_points int default 0,
  add column if not exists parent_id uuid references profiles(id);

-- ── Update programs ────────────────────────────────────────────
alter table programs
  add column if not exists division division_type,
  add column if not exists price_gbp decimal(10,2) default 0,
  add column if not exists payment_required boolean default false;

-- Update enrollments: add payment_status
alter table enrollments
  add column if not exists payment_status text default 'free'
  check (payment_status in ('free','pending','confirmed','failed','refunded'));

-- ── Payments ─────────────────────────────────────────────────
create table payments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  program_id uuid references programs(id),
  enrollment_id uuid references enrollments(id),
  tournament_id uuid, -- filled for tournament entry fees
  amount_gbp decimal(10,2) not null,
  method text not null check (method in ('stripe','bank_transfer')),
  status text not null default 'pending'
    check (status in ('pending','confirmed','failed','refunded')),
  stripe_payment_intent_id text,
  stripe_client_secret text,
  bank_reference text,
  notes text,
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz default now()
);

-- ── Tournaments ───────────────────────────────────────────────
create table tournaments (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_date date not null,
  end_date date,
  location text,
  eligible_divisions text[] not null default '{"semi_pro","pro"}',
  max_participants int,
  entry_fee_gbp decimal(10,2) default 0,
  organizer text default 'BPT Academy × BPT',
  status text not null default 'upcoming'
    check (status in ('upcoming','registration_open','ongoing','completed')),
  registration_deadline date,
  created_at timestamptz default now()
);

create table tournament_registrations (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  payment_id uuid references payments(id),
  division division_type,
  status text not null default 'pending'
    check (status in ('pending','confirmed','withdrawn')),
  registered_at timestamptz default now(),
  unique(tournament_id, student_id)
);

create table tournament_matches (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  round text not null,
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id),
  winner_id uuid references profiles(id),
  score text,
  court text,
  scheduled_at timestamptz,
  played_at timestamptz,
  created_at timestamptz default now()
);

-- ── Courts ───────────────────────────────────────────────────
create table courts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text,
  surface text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table court_bookings (
  id uuid default gen_random_uuid() primary key,
  court_id uuid references courts(id),
  student_id uuid references profiles(id) on delete cascade,
  program_session_id uuid references program_sessions(id),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'confirmed'
    check (status in ('confirmed','cancelled')),
  created_at timestamptz default now()
);

-- ── Session attendance & feedback ─────────────────────────────
create table session_attendance (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references program_sessions(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  attended boolean default false,
  marked_at timestamptz,
  marked_by uuid references profiles(id),
  feedback_rating int check (feedback_rating between 1 and 5),
  feedback_text text,
  created_at timestamptz default now(),
  unique(session_id, student_id)
);

-- ── Coach notes ───────────────────────────────────────────────
create table coach_notes (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  coach_id uuid references profiles(id) on delete cascade,
  note text not null,
  is_private boolean default false, -- false = student can see it
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Rankings ─────────────────────────────────────────────────
create table ranking_events (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  division division_type,
  points int not null,
  reason text not null, -- 'tournament_win','tournament_runner_up','module_complete','attendance'
  reference_id uuid,
  created_at timestamptz default now()
);

-- ── RLS policies ──────────────────────────────────────────────

-- Payments
alter table payments enable row level security;
create policy "Students see own payments"
  on payments for select using (auth.uid() = student_id);
create policy "Admins see all payments"
  on payments for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );
create policy "Students can create payments"
  on payments for insert with check (auth.uid() = student_id);
create policy "Admins can update payments"
  on payments for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );

-- Tournaments - public read
alter table tournaments enable row level security;
create policy "Anyone authenticated can view tournaments"
  on tournaments for select using (auth.uid() is not null);
create policy "Admins manage tournaments"
  on tournaments for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );

-- Tournament registrations
alter table tournament_registrations enable row level security;
create policy "Students see own registrations"
  on tournament_registrations for select using (auth.uid() = student_id);
create policy "Admins see all registrations"
  on tournament_registrations for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );
create policy "Students can register"
  on tournament_registrations for insert with check (auth.uid() = student_id);

-- Tournament matches - public read
alter table tournament_matches enable row level security;
create policy "Anyone can view matches"
  on tournament_matches for select using (auth.uid() is not null);
create policy "Admins manage matches"
  on tournament_matches for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );

-- Courts
alter table courts enable row level security;
create policy "Anyone can view courts"
  on courts for select using (auth.uid() is not null);
create policy "Admins manage courts"
  on courts for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );

-- Court bookings
alter table court_bookings enable row level security;
create policy "Students see own bookings"
  on court_bookings for select using (auth.uid() = student_id);
create policy "Admins see all bookings"
  on court_bookings for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );
create policy "Students can book"
  on court_bookings for insert with check (auth.uid() = student_id);
create policy "Students can cancel own bookings"
  on court_bookings for update using (auth.uid() = student_id);

-- Attendance
alter table session_attendance enable row level security;
create policy "Students see own attendance"
  on session_attendance for select using (auth.uid() = student_id);
create policy "Admins see all attendance"
  on session_attendance for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );
create policy "Students can submit feedback"
  on session_attendance for update using (auth.uid() = student_id);
create policy "Admins can mark attendance"
  on session_attendance for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );

-- Coach notes
alter table coach_notes enable row level security;
create policy "Students see public notes about them"
  on coach_notes for select using (auth.uid() = student_id and is_private = false);
create policy "Admins/coaches see all notes"
  on coach_notes for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );
create policy "Coaches can write notes"
  on coach_notes for insert with check (
    auth.uid() = coach_id and
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );
create policy "Coaches can update own notes"
  on coach_notes for update using (auth.uid() = coach_id);
create policy "Coaches can delete own notes"
  on coach_notes for delete using (auth.uid() = coach_id);

-- Rankings
alter table ranking_events enable row level security;
create policy "Anyone can view rankings"
  on ranking_events for select using (auth.uid() is not null);
create policy "Admins manage rankings"
  on ranking_events for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','coach'))
  );
