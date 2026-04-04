-- BPT Academy migrations snapshot 20260403_200624
-- =============================================
-- BPT Academy - Database Schema
-- =============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create type user_role as enum ('student', 'coach', 'admin', 'parent');
create type skill_level as enum ('beginner', 'intermediate', 'advanced', 'competition');

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role user_role not null default 'student',
  full_name text not null,
  phone text,
  avatar_url text,
  skill_level skill_level,
  date_of_birth date,
  emergency_contact text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Parent-child relationships
create table parent_student (
  parent_id uuid references profiles(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  primary key (parent_id, student_id)
);

-- =============================================
-- PROGRAMS
-- =============================================
create table programs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  skill_level skill_level not null,
  duration_weeks int,
  max_students int,
  coach_id uuid references profiles(id),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Program sessions (scheduled classes)
create table program_sessions (
  id uuid default gen_random_uuid() primary key,
  program_id uuid references programs(id) on delete cascade,
  title text not null,
  description text,
  scheduled_at timestamptz,
  duration_minutes int default 60,
  location text,
  created_at timestamptz default now()
);

-- =============================================
-- ENROLLMENTS
-- =============================================
create type enrollment_status as enum ('active', 'waitlisted', 'completed', 'cancelled');

create table enrollments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  program_id uuid references programs(id) on delete cascade,
  status enrollment_status default 'active',
  enrolled_at timestamptz default now(),
  unique(student_id, program_id)
);

-- =============================================
-- PROGRESS TRACKING
-- =============================================
create table modules (
  id uuid default gen_random_uuid() primary key,
  program_id uuid references programs(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  created_at timestamptz default now()
);

create table student_progress (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  module_id uuid references modules(id) on delete cascade,
  completed boolean default false,
  score int check (score >= 0 and score <= 100),
  completed_at timestamptz,
  notes text,
  unique(student_id, module_id)
);

-- =============================================
-- VIDEO LIBRARY
-- =============================================
create table videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  program_id uuid references programs(id),
  uploaded_by uuid references profiles(id),
  mux_asset_id text,
  mux_playback_id text,
  duration_seconds int,
  drill_type text,
  skill_focus text,
  tags text[],
  is_published boolean default false,
  created_at timestamptz default now()
);

create table video_bookmarks (
  student_id uuid references profiles(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (student_id, video_id)
);

create table video_comments (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references videos(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- =============================================
-- MESSAGING
-- =============================================
create table conversations (
  id uuid default gen_random_uuid() primary key,
  is_group boolean default false,
  title text, -- for group announcements
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
create table notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references profiles(id) on delete cascade,
  title text not null,
  body text,
  type text, -- 'session_reminder', 'new_video', 'message', 'announcement'
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table profiles enable row level security;
alter table programs enable row level security;
alter table program_sessions enable row level security;
alter table enrollments enable row level security;
alter table modules enable row level security;
alter table student_progress enable row level security;
alter table videos enable row level security;
alter table video_bookmarks enable row level security;
alter table video_comments enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- Profiles: users can read all profiles, only update their own
create policy "Profiles are viewable by authenticated users"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Programs: everyone authenticated can view active programs
create policy "Anyone can view active programs"
  on programs for select using (is_active = true and auth.role() = 'authenticated');

-- Enrollments: students see their own, coaches see all
create policy "Students see own enrollments"
  on enrollments for select using (auth.uid() = student_id);

create policy "Students can enroll themselves"
  on enrollments for insert with check (auth.uid() = student_id);

-- Progress: students see own, coaches see all in their programs
create policy "Students see own progress"
  on student_progress for select using (auth.uid() = student_id);

create policy "Students update own progress"
  on student_progress for update using (auth.uid() = student_id);

-- Videos: all authenticated users can view published videos
create policy "Authenticated users can view published videos"
  on videos for select using (is_published = true and auth.role() = 'authenticated');

-- Notifications: users only see their own
create policy "Users see own notifications"
  on notifications for select using (auth.uid() = recipient_id);

-- Messages: conversation members only
create policy "Members can view messages"
  on messages for select using (
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id
      and profile_id = auth.uid()
    )
  );

create policy "Members can send messages"
  on messages for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id
      and profile_id = auth.uid()
    )
  );

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function handle_updated_at();

create trigger programs_updated_at before update on programs
  for each row execute function handle_updated_at();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
-- Drop and recreate the trigger with better error handling
create or replace function handle_new_user()
returns trigger as $$
declare
  user_role_val user_role;
begin
  -- Safely parse role with fallback
  begin
    user_role_val := coalesce(new.raw_user_meta_data->>'role', 'student')::user_role;
  exception when others then
    user_role_val := 'student';
  end;

  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    user_role_val,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Recreate the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
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
-- Allow coaches/admins to upload to training-videos bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('training-videos', 'training-videos', true, 524288000)
on conflict (id) do nothing;

-- Anyone authenticated can view videos (bucket is public)
create policy "Public video access"
  on storage.objects for select
  using (bucket_id = 'training-videos');

-- Only coaches/admins can upload
create policy "Coaches can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'training-videos' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('coach', 'admin')
    )
  );

-- Coaches can delete their own uploads
create policy "Coaches can delete videos"
  on storage.objects for delete
  using (
    bucket_id = 'training-videos' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('coach', 'admin')
    )
  );
-- Drop the existing restrictive video select policy
drop policy if exists "Authenticated users can view published videos" on videos;

-- Recreate with correct check: any logged-in user can view published videos
create policy "Authenticated users can view published videos"
  on videos for select
  using (
    is_published = true
    and auth.uid() is not null
  );
-- Video comments: any authenticated user can read and post
create policy "Authenticated users can view comments"
  on video_comments for select
  using (auth.uid() is not null);

create policy "Authenticated users can post comments"
  on video_comments for insert
  with check (auth.uid() = author_id);

-- Video bookmarks: users manage their own
create policy "Users can view own bookmarks"
  on video_bookmarks for select
  using (auth.uid() = student_id);

create policy "Users can insert own bookmarks"
  on video_bookmarks for insert
  with check (auth.uid() = student_id);

create policy "Users can delete own bookmarks"
  on video_bookmarks for delete
  using (auth.uid() = student_id);
-- Avatar storage policies
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 5242880)
on conflict (id) do nothing;

create policy "Public avatar access"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
  );
-- Conversations: members can view
create policy "Members can view conversations"
  on conversations for select
  using (
    exists (
      select 1 from conversation_members
      where conversation_id = conversations.id
      and profile_id = auth.uid()
    )
  );

-- Anyone authenticated can create a conversation
create policy "Authenticated users can create conversations"
  on conversations for insert
  with check (auth.uid() is not null);

-- Conversation members: authenticated can insert/select
create policy "Authenticated can view conversation members"
  on conversation_members for select
  using (auth.uid() is not null);

create policy "Authenticated can join conversations"
  on conversation_members for insert
  with check (auth.uid() is not null);
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
-- Update any existing 'competition' skill levels to 'advanced'
update profiles set skill_level = 'advanced' where skill_level = 'competition';

-- Update programs too
update programs set skill_level = 'advanced' where skill_level = 'competition';
-- Make skill_level nullable since Semi-Pro and Pro don't have sub-levels
alter table programs alter column skill_level drop not null;
-- Academy settings table for admin-configurable values
create table if not exists academy_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Insert default bank details (admin can update these in-app)
insert into academy_settings (key, value) values
  ('bank_account_name',   'BPT Academy Ltd'),
  ('bank_sort_code',      '20-12-34'),
  ('bank_account_number', '12345678'),
  ('bank_payment_notes',  'Please use the reference provided. Payments are confirmed within 1–2 business days.')
on conflict (key) do nothing;

-- RLS: anyone authenticated can read; only admins/coaches can write
alter table academy_settings enable row level security;

create policy "Anyone can read settings"
  on academy_settings for select using (auth.role() = 'authenticated');

create policy "Admins can update settings"
  on academy_settings for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'coach')
    )
  );
insert into academy_settings (key, value) values
  ('stripe_publishable_key', 'pk_live_51SQF2UCryzcsryG9zluIixJqTmQWDHUGXb8RHDvAXRxDj4TLl15h9GozGnrDz9T0deLT5mZwOWr4cnrB87WmyaNI00LiUT7BL5')
on conflict (key) do update set value = excluded.value, updated_at = now();
insert into academy_settings (key, value) values
  ('stripe_payment_link_amateur', 'https://buy.stripe.com/bJeaEW6fN90geZM2IPffy02')
on conflict (key) do update set value = excluded.value, updated_at = now();
-- Ensure all authenticated users can read basic profile info
-- (needed for messaging — admins listing students, students listing coaches)
drop policy if exists "Authenticated users can read profiles" on profiles;

create policy "Authenticated users can read profiles"
  on profiles for select
  using (auth.role() = 'authenticated');
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
alter table programs add column if not exists price_gbp numeric(10,2) default null;
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
alter table programs
  add column if not exists sessions_per_week int default 2
  check (sessions_per_week >= 2 and sessions_per_week <= 4);
-- Link sessions to modules so attendance drives progress
alter table program_sessions
  add column if not exists module_id uuid references modules(id) on delete set null;
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
-- =============================================
-- Migration: Add super_admin to user_role enum
-- 2026-03-26
-- =============================================
-- MUST be committed in its own transaction before
-- any policies can reference the new enum value.
-- (Postgres restriction: new enum values are not
--  visible within the same transaction they were added)
-- =============================================

alter type user_role add value if not exists 'super_admin';
-- =============================================
-- Migration: Fix publicly accessible table
-- 2026-03-26
-- =============================================
-- Supabase warning: "Table publicly accessible —
-- RLS has not been enabled on tables in schemas
-- exposed to PostgREST"
--
-- Affected table: parent_student
-- This table was created in the initial schema
-- without RLS being enabled on it.
-- =============================================

alter table parent_student enable row level security;

-- Parents can see their own links
create policy "Parents see own links"
  on parent_student for select
  using (auth.uid() = parent_id);

-- Students can see who their parents are
create policy "Students see their parent links"
  on parent_student for select
  using (auth.uid() = student_id);

-- Only admins and super_admin can create/modify parent-student links
create policy "Admins manage parent-student links"
  on parent_student for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );
-- =============================================
-- Migration: super_admin RLS policies + role fn
-- 2026-03-26
-- =============================================
-- Depends on 20260326000001 (enum add) being
-- committed first. Updates every RLS policy to
-- include super_admin, and adds assign_user_role().
-- =============================================

-- ── profiles ──────────────────────────────────────────────────
drop policy if exists "Coaches can update any profile" on profiles;
create policy "Coaches can update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

create policy "Super admins can delete profiles"
  on profiles for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'super_admin'
    )
  );

-- ── programs ──────────────────────────────────────────────────
drop policy if exists "Coaches can insert programs" on programs;
drop policy if exists "Coaches can update programs" on programs;
drop policy if exists "Coaches can delete programs" on programs;

create policy "Coaches can insert programs"
  on programs for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

create policy "Coaches can update programs"
  on programs for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

create policy "Coaches can delete programs"
  on programs for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

-- ── program_sessions ──────────────────────────────────────────
drop policy if exists "Coaches can manage program sessions" on program_sessions;
drop policy if exists "Coaches can update program sessions" on program_sessions;

create policy "Coaches can manage program sessions"
  on program_sessions for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update program sessions"
  on program_sessions for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

-- ── modules ───────────────────────────────────────────────────
drop policy if exists "Coaches can manage modules" on modules;
drop policy if exists "Coaches can update modules" on modules;
drop policy if exists "Coaches can delete modules" on modules;

create policy "Coaches can manage modules"
  on modules for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update modules"
  on modules for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can delete modules"
  on modules for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

-- ── videos ────────────────────────────────────────────────────
drop policy if exists "Coaches can insert videos" on videos;
drop policy if exists "Coaches can update videos" on videos;

create policy "Coaches can insert videos"
  on videos for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update videos"
  on videos for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Admins can delete videos"
  on videos for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

-- ── enrollments ───────────────────────────────────────────────
drop policy if exists "Coaches can view all enrollments" on enrollments;
drop policy if exists "Coaches can update enrollments" on enrollments;

create policy "Coaches can view all enrollments"
  on enrollments for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update enrollments"
  on enrollments for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Admins can delete enrollments"
  on enrollments for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

-- ── student_progress ──────────────────────────────────────────
drop policy if exists "Coaches can view all progress" on student_progress;
drop policy if exists "Coaches can update student progress" on student_progress;

create policy "Coaches can view all progress"
  on student_progress for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

create policy "Coaches can update student progress"
  on student_progress for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

-- ── notifications ─────────────────────────────────────────────
drop policy if exists "Coaches can send notifications" on notifications;

create policy "Coaches can send notifications"
  on notifications for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin', 'super_admin'))
  );

-- ── payments ──────────────────────────────────────────────────
drop policy if exists "Admins see all payments" on payments;
drop policy if exists "Admins can update payments" on payments;

create policy "Admins see all payments"
  on payments for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Admins can update payments"
  on payments for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── tournaments ───────────────────────────────────────────────
drop policy if exists "Admins manage tournaments" on tournaments;

create policy "Admins manage tournaments"
  on tournaments for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── tournament_registrations ──────────────────────────────────
drop policy if exists "Admins see all registrations" on tournament_registrations;

create policy "Admins see all registrations"
  on tournament_registrations for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── tournament_matches ────────────────────────────────────────
drop policy if exists "Admins manage matches" on tournament_matches;

create policy "Admins manage matches"
  on tournament_matches for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── courts ────────────────────────────────────────────────────
drop policy if exists "Admins manage courts" on courts;

create policy "Admins manage courts"
  on courts for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── court_bookings ────────────────────────────────────────────
drop policy if exists "Admins see all bookings" on court_bookings;

create policy "Admins see all bookings"
  on court_bookings for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── session_attendance ────────────────────────────────────────
drop policy if exists "Admins see all attendance" on session_attendance;
drop policy if exists "Admins can mark attendance" on session_attendance;

create policy "Admins see all attendance"
  on session_attendance for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Admins can mark attendance"
  on session_attendance for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── coach_notes ───────────────────────────────────────────────
drop policy if exists "Admins/coaches see all notes" on coach_notes;

create policy "Admins/coaches see all notes"
  on coach_notes for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── ranking_events ────────────────────────────────────────────
drop policy if exists "Admins manage rankings" on ranking_events;

create policy "Admins manage rankings"
  on ranking_events for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── academy_settings ──────────────────────────────────────────
drop policy if exists "Admins can update settings" on academy_settings;

-- Coaches intentionally excluded from settings management
create policy "Admins can update settings"
  on academy_settings for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- ── program_coaches ───────────────────────────────────────────
drop policy if exists "Admins can manage program coaches" on program_coaches;

create policy "Admins can manage program coaches"
  on program_coaches for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'coach', 'super_admin')
    )
  );

-- ── promotion_cycles ──────────────────────────────────────────
drop policy if exists "Admins see all cycles" on promotion_cycles;
drop policy if exists "Admins manage cycles" on promotion_cycles;

create policy "Admins see all cycles"
  on promotion_cycles for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Admins manage cycles"
  on promotion_cycles for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- ── student_goals ─────────────────────────────────────────────
drop policy if exists "Coaches see all goals" on student_goals;
drop policy if exists "Coaches manage goals" on student_goals;

create policy "Coaches see all goals"
  on student_goals for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

create policy "Coaches manage goals"
  on student_goals for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coach', 'super_admin'))
  );

-- =============================================
-- assign_user_role() — super_admin only
-- =============================================
create or replace function assign_user_role(
  target_user_id uuid,
  new_role user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'super_admin'
  ) then
    raise exception 'Only super_admin can assign roles';
  end if;

  if new_role != 'super_admin' then
    if (select count(*) from profiles where role = 'super_admin') <= 1
       and (select role from profiles where id = target_user_id) = 'super_admin' then
      raise exception 'Cannot remove the last super_admin';
    end if;
  end if;

  update profiles set role = new_role where id = target_user_id;
end;
$$;
-- =============================================
-- Migration: Promotion Engine
-- 2026-03-26
-- =============================================
-- Upgrades the promotion system to:
-- 1. Track active weeks (Option B — only weeks
--    with attendance count toward the minimum)
-- 2. Store performance score snapshot
-- 3. Auto-flag eligible when both thresholds met
-- 4. Enforce minimum active-week requirements
-- =============================================

-- ── Extend promotion_cycles ───────────────────────────────────
alter table promotion_cycles
  add column if not exists min_active_weeks    int not null default 8,
  add column if not exists active_weeks_so_far int not null default 0,
  add column if not exists attendance_pct      int not null default 0,
  add column if not exists performance_pct     int not null default 0,
  add column if not exists last_evaluated_at   timestamptz,
  add column if not exists rejection_note      text,
  add column if not exists program_id          uuid references programs(id);

-- min_active_weeks per transition:
--   amateur_beginner     → amateur_intermediate : 8  weeks (2 months)
--   amateur_intermediate → amateur_advanced     : 8  weeks (2 months)
--   amateur_advanced     → semi_pro             : 13 weeks (3 months)
--   semi_pro             → pro                  : 13 weeks (3 months)

-- ── Function: calculate active weeks ──────────────────────────
-- An "active week" = a calendar week where the student attended
-- at least one session. This is Option B — time only counts
-- when the student actually showed up.
create or replace function get_active_weeks(
  p_student_id  uuid,
  p_program_id  uuid,
  p_from_date   date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_weeks int;
begin
  select count(distinct date_trunc('week', ps.scheduled_at))
  into v_active_weeks
  from session_attendance sa
  join program_sessions ps on ps.id = sa.session_id
  where sa.student_id  = p_student_id
    and ps.program_id  = p_program_id
    and sa.attended    = true
    and ps.scheduled_at >= p_from_date::timestamptz;

  return coalesce(v_active_weeks, 0);
end;
$$;

-- ── Function: calculate attendance % ─────────────────────────
create or replace function get_attendance_pct(
  p_student_id  uuid,
  p_program_id  uuid,
  p_from_date   date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total     int;
  v_attended  int;
begin
  -- Total sessions in the program from cycle start to now
  select count(*) into v_total
  from program_sessions
  where program_id   = p_program_id
    and scheduled_at >= p_from_date::timestamptz
    and scheduled_at <= now();

  if v_total = 0 then return 0; end if;

  -- Sessions the student attended
  select count(*) into v_attended
  from session_attendance sa
  join program_sessions ps on ps.id = sa.session_id
  where sa.student_id  = p_student_id
    and ps.program_id  = p_program_id
    and sa.attended    = true
    and ps.scheduled_at >= p_from_date::timestamptz
    and ps.scheduled_at <= now();

  return round((v_attended::numeric / v_total) * 100);
end;
$$;

-- ── Function: calculate performance % ────────────────────────
-- Average of all module scores for the student in their program.
-- Only counts modules that have been scored (score is not null).
create or replace function get_performance_pct(
  p_student_id uuid,
  p_program_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg int;
begin
  select round(avg(sp.score))
  into v_avg
  from student_progress sp
  join modules m on m.id = sp.module_id
  where sp.student_id = p_student_id
    and m.program_id  = p_program_id
    and sp.score      is not null;

  return coalesce(v_avg, 0);
end;
$$;

-- ── Function: evaluate a single promotion cycle ───────────────
-- Called by the auto-check. Updates the cycle's stats and
-- flips status to 'eligible' when all criteria are met.
create or replace function evaluate_promotion_cycle(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle         promotion_cycles%rowtype;
  v_active_weeks  int;
  v_att_pct       int;
  v_perf_pct      int;
  v_program_id    uuid;
begin
  select * into v_cycle from promotion_cycles where id = p_cycle_id;
  if not found then return; end if;
  if v_cycle.status not in ('active') then return; end if;

  -- Resolve program: use stored program_id or find student's active enrollment
  v_program_id := v_cycle.program_id;
  if v_program_id is null then
    select program_id into v_program_id
    from enrollments
    where student_id = v_cycle.student_id
      and status = 'active'
    order by enrolled_at desc
    limit 1;
  end if;

  if v_program_id is null then return; end if;

  -- Calculate all three metrics
  v_active_weeks := get_active_weeks(v_cycle.student_id, v_program_id, v_cycle.cycle_start_date);
  v_att_pct      := get_attendance_pct(v_cycle.student_id, v_program_id, v_cycle.cycle_start_date);
  v_perf_pct     := get_performance_pct(v_cycle.student_id, v_program_id);

  -- Update the cycle with latest stats
  update promotion_cycles set
    active_weeks_so_far = v_active_weeks,
    attendance_pct      = v_att_pct,
    performance_pct     = v_perf_pct,
    last_evaluated_at   = now(),
    program_id          = v_program_id
  where id = p_cycle_id;

  -- Check if all criteria met → flip to eligible
  if v_active_weeks  >= v_cycle.min_active_weeks
  and v_att_pct      >= v_cycle.required_attendance_pct
  and v_perf_pct     >= 80
  then
    update promotion_cycles
    set status = 'eligible'
    where id = p_cycle_id;

    -- Notify the student
    insert into notifications (recipient_id, title, body, type)
    select
      v_cycle.student_id,
      '⭐ You''re eligible for promotion!',
      'You''ve hit the attendance and performance targets. Your coach will review and approve your promotion soon.',
      'promotion';
  end if;
end;
$$;

-- ── Function: evaluate ALL active cycles (called by cron) ─────
create or replace function evaluate_all_promotion_cycles()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id  uuid;
  v_count     int := 0;
begin
  for v_cycle_id in
    select id from promotion_cycles where status = 'active'
  loop
    perform evaluate_promotion_cycle(v_cycle_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── Function: start promotion cycle automatically ─────────────
-- Called when a student is enrolled in a program.
-- Looks up their current level and starts the right cycle.
create or replace function start_promotion_cycle_for_student(
  p_student_id uuid,
  p_program_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile       profiles%rowtype;
  v_from_level    text;
  v_to_level      text;
  v_min_weeks     int;
  v_needs_approval boolean;
  v_existing      int;
begin
  select * into v_profile from profiles where id = p_student_id;
  if not found then return; end if;

  -- Don't create duplicate active cycles
  select count(*) into v_existing
  from promotion_cycles
  where student_id = p_student_id
    and status in ('active', 'eligible', 'approved');
  if v_existing > 0 then return; end if;

  -- Determine from/to levels based on profile
  if v_profile.division = 'amateur' then
    if v_profile.skill_level = 'beginner' or v_profile.skill_level is null then
      v_from_level := 'amateur_beginner';
      v_to_level   := 'amateur_intermediate';
      v_min_weeks  := 8;
      v_needs_approval := false;
    elsif v_profile.skill_level = 'intermediate' then
      v_from_level := 'amateur_intermediate';
      v_to_level   := 'amateur_advanced';
      v_min_weeks  := 8;
      v_needs_approval := false;
    elsif v_profile.skill_level = 'advanced' then
      v_from_level := 'amateur_advanced';
      v_to_level   := 'semi_pro';
      v_min_weeks  := 13;
      v_needs_approval := true;
    else
      return; -- unknown level
    end if;
  elsif v_profile.division = 'semi_pro' then
    v_from_level := 'semi_pro';
    v_to_level   := 'pro';
    v_min_weeks  := 13;
    v_needs_approval := true;
  else
    return; -- pro or junior — no auto cycle
  end if;

  insert into promotion_cycles (
    student_id,
    program_id,
    from_level,
    to_level,
    cycle_start_date,
    cycle_end_date,
    required_attendance_pct,
    min_active_weeks,
    requires_coach_approval,
    status
  ) values (
    p_student_id,
    p_program_id,
    v_from_level,
    v_to_level,
    current_date,
    current_date + (v_min_weeks * 7),  -- initial end date estimate
    80,
    v_min_weeks,
    v_needs_approval,
    'active'
  );

  -- Notify student
  insert into notifications (recipient_id, title, body, type)
  values (
    p_student_id,
    '🎯 Your promotion journey has started!',
    'Attend at least 80% of your sessions and maintain 80% performance to become eligible for promotion.',
    'promotion'
  );
end;
$$;

-- ── Trigger: auto-start cycle on enrollment ───────────────────
create or replace function trigger_promotion_on_enroll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' then
    perform start_promotion_cycle_for_student(new.student_id, new.program_id);
  end if;
  return new;
end;
$$;

drop trigger if exists auto_start_promotion_cycle on enrollments;
create trigger auto_start_promotion_cycle
  after insert or update of status on enrollments
  for each row execute function trigger_promotion_on_enroll();
-- =============================================
-- Migration: Promotion cron scheduling
-- 2026-03-26
-- =============================================
-- NOTE: pg_cron must be enabled in Supabase dashboard first:
-- Dashboard → Database → Extensions → search "pg_cron" → Enable
--
-- Until then, evaluate_all_promotion_cycles() is called
-- via the evaluate-promotions Edge Function, triggered hourly
-- by the OpenClaw cron scheduler.
--
-- Once pg_cron is enabled, run this manually in SQL editor:
--
--   select cron.schedule(
--     'evaluate-promotion-cycles',
--     '0 * * * *',
--     $$select evaluate_all_promotion_cycles()$$
--   );
-- =============================================

-- Nothing to execute until pg_cron is enabled.
-- This file is a placeholder / documentation.
select 1;
-- =============================================
-- Migration: Schedule promotion eval via pg_cron
-- 2026-03-26 — Run after pg_cron is enabled
-- =============================================

select cron.schedule(
  'evaluate-promotion-cycles',
  '0 * * * *',
  $$select evaluate_all_promotion_cycles()$$
);
-- =============================================
-- Migration: Fix messaging RLS policies
-- 2026-03-26
-- =============================================
-- Fix "new row violates row-level security policy
-- for table conversations" error.
-- The original policy used auth.role() = 'authenticated'
-- which is unreliable. Replace with auth.uid() checks.
-- Also tighten conversation_members insert policy.
-- =============================================

-- ── conversations ─────────────────────────────────────────────
drop policy if exists "Authenticated users can create conversations" on conversations;
drop policy if exists "Members can view conversations" on conversations;

-- Anyone signed in can create a conversation
create policy "Authenticated users can create conversations"
  on conversations for insert
  with check (auth.uid() is not null);

-- Creator or members can view their conversations
create policy "Members can view conversations"
  on conversations for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from conversation_members
      where conversation_id = conversations.id
      and profile_id = auth.uid()
    )
  );

-- Creator can update/delete their conversation
create policy "Creator can update conversations"
  on conversations for update
  using (auth.uid() = created_by);

create policy "Creator can delete conversations"
  on conversations for delete
  using (auth.uid() = created_by);

-- ── conversation_members ──────────────────────────────────────
drop policy if exists "Authenticated can view conversation members" on conversation_members;
drop policy if exists "Authenticated can join conversations" on conversation_members;

-- Members can see other members of their conversations
create policy "Authenticated can view conversation members"
  on conversation_members for select
  using (auth.uid() is not null);

-- Authenticated users can add members (coaches adding students etc.)
create policy "Authenticated can join conversations"
  on conversation_members for insert
  with check (auth.uid() is not null);

-- Members can leave conversations
create policy "Members can leave conversations"
  on conversation_members for delete
  using (auth.uid() = profile_id);
-- =============================================
-- Migration: Enable Realtime on messaging tables
-- 2026-03-26
-- =============================================
-- The supabase_realtime publication had no tables,
-- which is why chat messages never arrived via
-- WebSocket. Add messages + notifications tables
-- so real-time subscriptions work.
-- =============================================

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table conversation_members;
-- =============================================
-- Migration: Fix division not being set on
-- registration and enrollment
-- 2026-03-26
-- =============================================
-- Root causes:
-- 1. handle_new_user() trigger ignored division
--    and skill_level from registration metadata
-- 2. Enrolling in a program never updated the
--    student's profile division/skill_level
-- =============================================

-- ── Fix 1: handle_new_user trigger ───────────────────────────
create or replace function handle_new_user()
returns trigger as $$
declare
  user_role_val     user_role;
  user_division_val text;
  user_skill_val    text;
begin
  begin
    user_role_val := coalesce(new.raw_user_meta_data->>'role', 'student')::user_role;
  exception when others then
    user_role_val := 'student';
  end;

  user_division_val := new.raw_user_meta_data->>'division';
  user_skill_val    := new.raw_user_meta_data->>'skill_level';

  insert into public.profiles (id, full_name, role, phone, division, skill_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    user_role_val,
    new.raw_user_meta_data->>'phone',
    user_division_val,
    user_skill_val
  )
  on conflict (id) do update set
    division    = coalesce(excluded.division, profiles.division),
    skill_level = coalesce(excluded.skill_level, profiles.skill_level);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ── Fix 2: update profile division on enrollment ─────────────
-- When a student enrolls in a program, automatically set their
-- profile division (and skill_level if applicable) to match
-- the program they joined.
create or replace function sync_profile_division_on_enroll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_division  text;
  v_program_skill     text;
begin
  if new.status != 'active' then return new; end if;

  select division, skill_level
  into v_program_division, v_program_skill
  from programs
  where id = new.program_id;

  if v_program_division is null then return new; end if;

  -- Update profile division; skill_level only for amateur sub-levels
  if v_program_division = 'amateur' and v_program_skill is not null then
    update profiles
    set division    = v_program_division,
        skill_level = v_program_skill
    where id = new.student_id;
  else
    -- For semi_pro, pro: set division, clear skill_level (not applicable)
    update profiles
    set division    = v_program_division,
        skill_level = case when v_program_division = 'amateur' then skill_level else null end
    where id = new.student_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_division_on_enroll on enrollments;
create trigger sync_division_on_enroll
  after insert or update of status on enrollments
  for each row execute function sync_profile_division_on_enroll();

-- ── Fix 3: backfill Josep's division from his enrollment ──────
-- His enrollment is cancelled but we know he's a Pro player.
-- Update his profile division to 'pro' based on the program
-- he enrolled in.
update profiles
set division    = 'pro',
    skill_level = null
where id = '629f2752-3aa4-4221-a8ed-ee629bd9131e'
  and division is null;
-- Fix type cast error in sync_profile_division_on_enroll
-- division column is division_type enum, need explicit cast from text
create or replace function sync_profile_division_on_enroll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_division  text;
  v_program_skill     text;
begin
  if new.status != 'active' then return new; end if;

  select division::text, skill_level::text
  into v_program_division, v_program_skill
  from programs
  where id = new.program_id;

  if v_program_division is null then return new; end if;

  if v_program_division = 'amateur' and v_program_skill is not null then
    update profiles
    set division    = v_program_division::division_type,
        skill_level = v_program_skill::skill_level
    where id = new.student_id;
  else
    update profiles
    set division    = v_program_division::division_type,
        skill_level = null
    where id = new.student_id;
  end if;

  return new;
end;
$$;

-- Also fix start_promotion_cycle_for_student to handle Pro players:
-- Pro is the top level — no promotion cycle needed. Instead of returning
-- early silently, insert a completed/placeholder so the UI doesn't buffer.
-- The Promotion tab should show "You're at the top level!" for Pro players.
create or replace function start_promotion_cycle_for_student(
  p_student_id uuid,
  p_program_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile        profiles%rowtype;
  v_from_level     text;
  v_to_level       text;
  v_min_weeks      int;
  v_needs_approval boolean;
  v_existing       int;
begin
  select * into v_profile from profiles where id = p_student_id;
  if not found then return; end if;

  -- Don't create duplicate active cycles
  select count(*) into v_existing
  from promotion_cycles
  where student_id = p_student_id
    and status in ('active', 'eligible', 'approved');
  if v_existing > 0 then return; end if;

  -- Determine transition
  if v_profile.division = 'amateur' then
    if v_profile.skill_level = 'beginner' or v_profile.skill_level is null then
      v_from_level := 'amateur_beginner';
      v_to_level   := 'amateur_intermediate';
      v_min_weeks  := 8;
      v_needs_approval := false;
    elsif v_profile.skill_level = 'intermediate' then
      v_from_level := 'amateur_intermediate';
      v_to_level   := 'amateur_advanced';
      v_min_weeks  := 8;
      v_needs_approval := false;
    elsif v_profile.skill_level = 'advanced' then
      v_from_level := 'amateur_advanced';
      v_to_level   := 'semi_pro';
      v_min_weeks  := 13;
      v_needs_approval := true;
    else
      return;
    end if;
  elsif v_profile.division = 'semi_pro' then
    v_from_level := 'semi_pro';
    v_to_level   := 'pro';
    v_min_weeks  := 13;
    v_needs_approval := true;
  else
    -- Pro or junior — top level, no cycle needed
    return;
  end if;

  insert into promotion_cycles (
    student_id, program_id, from_level, to_level,
    cycle_start_date, cycle_end_date,
    required_attendance_pct, min_active_weeks,
    requires_coach_approval, status
  ) values (
    p_student_id, p_program_id, v_from_level, v_to_level,
    current_date, current_date + (v_min_weeks * 7),
    80, v_min_weeks, v_needs_approval, 'active'
  );

  insert into notifications (recipient_id, title, body, type)
  values (
    p_student_id,
    '🎯 Your promotion journey has started!',
    'Attend at least 80% of your sessions and maintain 80% performance to become eligible for promotion.',
    'promotion'
  );
end;
$$;
-- =============================================
-- Migration: Messaging privacy + program channels
-- 2026-03-26
-- =============================================
-- 1. Add conversation_type to distinguish DMs from group channels
-- 2. Link group channels to programs
-- 3. Tighten RLS: DMs are truly private (2 members only)
-- 4. Auto-create program channel on program insert
-- 5. Auto-add/remove students from program channel on enrollment
-- =============================================

-- ── Step 1: Add type + program_id to conversations ────────────
alter table conversations
  add column if not exists conversation_type text not null default 'direct'
    check (conversation_type in ('direct', 'program_group')),
  add column if not exists program_id uuid references programs(id) on delete cascade;

-- ── Step 2: Tighten RLS ────────────────────────────────────────
-- Drop all existing conversation policies
drop policy if exists "Members can view conversations"           on conversations;
drop policy if exists "Authenticated users can create conversations" on conversations;
drop policy if exists "Creator can update conversations"         on conversations;
drop policy if exists "Creator can delete conversations"         on conversations;
drop policy if exists "Authenticated can view conversation members" on conversation_members;
drop policy if exists "Authenticated can join conversations"     on conversation_members;
drop policy if exists "Members can leave conversations"          on conversation_members;
drop policy if exists "Members can view messages"                on messages;
drop policy if exists "Members can send messages"                on messages;

-- conversations: only members can see their own conversations
create policy "Members see own conversations"
  on conversations for select
  using (
    exists (
      select 1 from conversation_members
      where conversation_id = conversations.id
      and profile_id = auth.uid()
    )
  );

-- Only coaches/admins/super_admin can create direct conversations
-- Program groups are created by the system (security definer functions)
create policy "Coaches can create direct conversations"
  on conversations for insert
  with check (
    auth.uid() is not null
    and (
      conversation_type = 'direct'
      or exists (
        select 1 from profiles
        where id = auth.uid()
        and role in ('coach', 'admin', 'super_admin')
      )
    )
  );

create policy "Creator can update conversations"
  on conversations for update
  using (auth.uid() = created_by);

-- conversation_members: members only see members of their own conversations
create policy "Members see conversation members"
  on conversation_members for select
  using (
    exists (
      select 1 from conversation_members cm2
      where cm2.conversation_id = conversation_members.conversation_id
      and cm2.profile_id = auth.uid()
    )
  );

-- Only system functions (security definer) and coaches add members
-- Students can't add themselves to conversations
create policy "Coaches can add members"
  on conversation_members for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
    or auth.uid() = profile_id  -- allow self-insert for new DM participants
  );

create policy "Members can leave"
  on conversation_members for delete
  using (auth.uid() = profile_id);

-- messages: members of the conversation only — enforces DM privacy
create policy "Members can view messages"
  on messages for select
  using (
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id
      and profile_id = auth.uid()
    )
  );

create policy "Members can send messages"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id
      and profile_id = auth.uid()
    )
  );

-- ── Step 3: Auto-create program group channel on program insert ──
create or replace function create_program_group_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid;
begin
  -- Create group conversation linked to this program
  insert into conversations (is_group, title, created_by, conversation_type, program_id)
  values (true, new.title || ' — Group', new.coach_id, 'program_group', new.id)
  returning id into v_conv_id;

  -- Add the coach as first member
  if new.coach_id is not null then
    insert into conversation_members (conversation_id, profile_id)
    values (v_conv_id, new.coach_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists auto_create_program_channel on programs;
create trigger auto_create_program_channel
  after insert on programs
  for each row execute function create_program_group_channel();

-- ── Step 4: Auto-add/remove students from program channel ────────
create or replace function sync_program_channel_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid;
begin
  -- Find the program's group channel
  select id into v_conv_id
  from conversations
  where program_id = new.program_id
    and conversation_type = 'program_group'
  limit 1;

  if v_conv_id is null then return new; end if;

  if new.status = 'active' then
    -- Add student to group channel
    insert into conversation_members (conversation_id, profile_id)
    values (v_conv_id, new.student_id)
    on conflict do nothing;
  else
    -- Remove student from group channel on cancel/complete
    delete from conversation_members
    where conversation_id = v_conv_id
      and profile_id = new.student_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_program_channel_membership on enrollments;
create trigger sync_program_channel_membership
  after insert or update of status on enrollments
  for each row execute function sync_program_channel_membership();

-- ── Step 5: Create program channels for existing programs ────────
do $$
declare
  r record;
  v_conv_id uuid;
  v_existing uuid;
begin
  for r in select id, title, coach_id from programs loop
    -- Skip if channel already exists
    select id into v_existing
    from conversations
    where program_id = r.id and conversation_type = 'program_group';

    if v_existing is null then
      insert into conversations (is_group, title, created_by, conversation_type, program_id)
      values (true, r.title || ' — Group', r.coach_id, 'program_group', r.id)
      returning id into v_conv_id;

      -- Add coach
      if r.coach_id is not null then
        insert into conversation_members (conversation_id, profile_id)
        values (v_conv_id, r.coach_id)
        on conflict do nothing;
      end if;

      -- Add all active students
      insert into conversation_members (conversation_id, profile_id)
      select v_conv_id, student_id
      from enrollments
      where program_id = r.id and status = 'active'
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- ── Step 6: Add program coaches to their program channels ─────────
insert into conversation_members (conversation_id, profile_id)
select c.id, pc.coach_id
from conversations c
join program_coaches pc on pc.program_id = c.program_id
where c.conversation_type = 'program_group'
on conflict do nothing;
-- Fix handle_new_user trigger: cast text → enum types safely
-- division_type and skill_level are enums — plain text insert fails
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      user_role;
  v_division  division_type;
  v_skill     skill_level;
  v_div_text  text;
  v_skill_text text;
begin
  -- Role
  begin
    v_role := coalesce(new.raw_user_meta_data->>'role', 'student')::user_role;
  exception when others then
    v_role := 'student';
  end;

  -- Division (safe cast — ignore invalid values)
  v_div_text := new.raw_user_meta_data->>'division';
  begin
    if v_div_text is not null and v_div_text <> '' then
      v_division := v_div_text::division_type;
    end if;
  exception when others then
    v_division := null;
  end;

  -- Skill level (safe cast — ignore invalid values)
  v_skill_text := new.raw_user_meta_data->>'skill_level';
  begin
    if v_skill_text is not null and v_skill_text <> '' then
      v_skill := v_skill_text::skill_level;
    end if;
  exception when others then
    v_skill := null;
  end;

  insert into public.profiles (id, full_name, role, phone, division, skill_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone',
    v_division,
    v_skill
  )
  on conflict (id) do update set
    division    = coalesce(excluded.division,    profiles.division),
    skill_level = coalesce(excluded.skill_level, profiles.skill_level);

  return new;
end;
$$;
-- Fix conversation_members insert RLS for direct message creation
-- When a coach/admin creates a DM, they need to insert TWO rows:
-- one for themselves and one for the student.
-- The previous policy only allowed self-insert or coach role,
-- but didn't allow coaches to insert the student's membership row.
-- Also fix: conversations insert policy was too strict for super_admin role.

-- ── conversation_members ──────────────────────────────────────
drop policy if exists "Coaches can add members"    on conversation_members;

-- Allow: self-insert (joining yourself)
-- OR: inserting into a conversation you created (adding the other DM participant)
-- OR: coach/admin/super_admin adding anyone
create policy "Members can be added to conversations"
  on conversation_members for insert
  with check (
    -- Self-insert always allowed
    auth.uid() = profile_id
    or
    -- The conversation was created by the current user (they're adding the other DM participant)
    exists (
      select 1 from conversations
      where id = conversation_members.conversation_id
        and created_by = auth.uid()
        and conversation_type = 'direct'
    )
    or
    -- Coach/admin/super_admin can add anyone to any conversation
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('coach', 'admin', 'super_admin')
    )
  );

-- ── conversations ─────────────────────────────────────────────
drop policy if exists "Coaches can create direct conversations" on conversations;

-- Any authenticated user with coach/admin/super_admin role can create conversations.
-- Students cannot create conversations (they receive DMs from coaches only).
create policy "Coaches and admins can create conversations"
  on conversations for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('coach', 'admin', 'super_admin')
    )
  );
-- Fix conversation insert RLS — subquery on profiles inside WITH CHECK
-- was unreliable because profiles SELECT policy uses auth.role() which
-- can fail inside policy evaluation context.
-- Solution: use a security definer function to check role safely.

create or replace function get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role::text from profiles where id = auth.uid();
$$;

-- ── conversations INSERT ──────────────────────────────────────
drop policy if exists "Coaches and admins can create conversations" on conversations;

create policy "Coaches and admins can create conversations"
  on conversations for insert
  with check (
    auth.uid() is not null
    and get_my_role() in ('coach', 'admin', 'super_admin')
  );

-- ── conversation_members INSERT ───────────────────────────────
drop policy if exists "Members can be added to conversations" on conversation_members;

create policy "Members can be added to conversations"
  on conversation_members for insert
  with check (
    -- Self-insert always allowed
    auth.uid() = profile_id
    or
    -- Creator of a direct conversation can add the other participant
    exists (
      select 1 from conversations
      where id = conversation_members.conversation_id
        and created_by = auth.uid()
    )
    or
    -- Coach/admin/super_admin can add anyone
    get_my_role() in ('coach', 'admin', 'super_admin')
  );
-- Fix infinite recursion in conversation_members SELECT policy.
-- The policy did EXISTS (SELECT 1 FROM conversation_members cm2 WHERE ...)
-- which re-triggers the same policy → infinite loop.
-- Solution: security definer function that reads conversation_members
-- without RLS, used as the policy gate instead.

create or replace function is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = p_conversation_id
      and profile_id = auth.uid()
  );
$$;

-- ── conversation_members SELECT ───────────────────────────────
drop policy if exists "Members see conversation members" on conversation_members;

create policy "Members see conversation members"
  on conversation_members for select
  using (is_conversation_member(conversation_id));

-- ── conversations SELECT ──────────────────────────────────────
drop policy if exists "Members see own conversations" on conversations;

create policy "Members see own conversations"
  on conversations for select
  using (is_conversation_member(id));

-- ── messages SELECT + INSERT ──────────────────────────────────
drop policy if exists "Members can view messages" on messages;
drop policy if exists "Members can send messages"  on messages;

create policy "Members can view messages"
  on messages for select
  using (is_conversation_member(conversation_id));

create policy "Members can send messages"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and is_conversation_member(conversation_id)
  );

-- ── conversation_members INSERT ───────────────────────────────
-- Also fix: creator check was doing EXISTS on conversations which
-- could recurse. Use created_by directly via security definer.
drop policy if exists "Members can be added to conversations" on conversation_members;

create or replace function is_conversation_creator(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from conversations
    where id = p_conversation_id
      and created_by = auth.uid()
  );
$$;

create policy "Members can be added to conversations"
  on conversation_members for insert
  with check (
    auth.uid() = profile_id
    or is_conversation_creator(conversation_id)
    or get_my_role() in ('coach', 'admin', 'super_admin')
  );
-- Add missing columns to modules table for full program content storage

ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS session_date DATE,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
-- Push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add push_sent column to notifications if not exists
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT FALSE;
-- =====================================================================
-- Notification Triggers
-- All triggers simply INSERT into the notifications table.
-- Push and email delivery is handled by the process-notifications
-- edge function (called by a cron job every 2 minutes).
-- =====================================================================

-- a) New message → notify all conversation members (except sender)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  member_id UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  FOR member_id IN
    SELECT user_id FROM conversation_members
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      member_id,
      'New message from ' || COALESCE(sender_name, 'Someone'),
      LEFT(NEW.content, 100),
      'new_message',
      jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- b) New enrollment → notify student + all admins
CREATE OR REPLACE FUNCTION notify_new_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
  program_title TEXT;
  admin_id UUID;
BEGIN
  SELECT full_name INTO student_name FROM profiles WHERE id = NEW.student_id;
  SELECT title INTO program_title FROM programs WHERE id = NEW.program_id;

  -- Notify the student
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    'Enrollment confirmed',
    'You have been enrolled in ' || COALESCE(program_title, 'a program'),
    'enrollment_confirmed',
    jsonb_build_object('program_id', NEW.program_id)
  );

  -- Notify all admins
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      admin_id,
      'New enrollment',
      COALESCE(student_name, 'A student') || ' enrolled in ' || COALESCE(program_title, 'a program'),
      'admin_new_enrollment',
      jsonb_build_object('program_id', NEW.program_id, 'student_id', NEW.student_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_enrollment ON enrollments;
CREATE TRIGGER on_new_enrollment
  AFTER INSERT ON enrollments
  FOR EACH ROW EXECUTE FUNCTION notify_new_enrollment();

-- c) New payment (status = 'completed') → notify student + admins
CREATE OR REPLACE FUNCTION notify_new_payment()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
  admin_id UUID;
BEGIN
  SELECT full_name INTO student_name FROM profiles WHERE id = NEW.student_id;

  -- Notify the student
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    'Payment received',
    'Your payment of £' || NEW.amount || ' has been received.',
    'payment_receipt',
    jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount)
  );

  -- Notify all admins
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      admin_id,
      'Payment received',
      COALESCE(student_name, 'A student') || ' paid £' || NEW.amount,
      'admin_new_payment',
      jsonb_build_object('payment_id', NEW.id, 'student_id', NEW.student_id, 'amount', NEW.amount)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_payment ON payments;
CREATE TRIGGER on_new_payment
  AFTER INSERT ON payments
  FOR EACH ROW WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION notify_new_payment();

-- d) New student profile (registration) → notify admins
CREATE OR REPLACE FUNCTION notify_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      admin_id,
      'New student registered',
      COALESCE(NEW.full_name, 'A new student') || ' just joined BPT Academy',
      'admin_new_registration',
      jsonb_build_object('student_id', NEW.id)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_registration ON profiles;
CREATE TRIGGER on_new_registration
  AFTER INSERT ON profiles
  FOR EACH ROW WHEN (NEW.role = 'student')
  EXECUTE FUNCTION notify_new_registration();

-- e) Coach note added → notify student
-- Note: This trigger depends on a coach_notes table existing with
-- columns: id, student_id, coach_id. Create after coach_notes table exists.
CREATE OR REPLACE FUNCTION notify_coach_note()
RETURNS TRIGGER AS $$
DECLARE
  coach_name TEXT;
BEGIN
  SELECT full_name INTO coach_name FROM profiles WHERE id = NEW.coach_id;

  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    'New coach note',
    COALESCE(coach_name, 'Your coach') || ' added a note to your profile',
    'coach_note',
    jsonb_build_object('note_id', NEW.id, 'coach_id', NEW.coach_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create this trigger if the coach_notes table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coach_notes'
  ) THEN
    DROP TRIGGER IF EXISTS on_coach_note ON coach_notes;
    CREATE TRIGGER on_coach_note
      AFTER INSERT ON coach_notes
      FOR EACH ROW EXECUTE FUNCTION notify_coach_note();
  END IF;
END;
$$;
-- =============================================================================
-- Migration: 20260328000003_division_channels
-- Purpose:   Division-scoped group channels for BPT Academy
--            - Adds division_group conversation type
--            - Ensures one channel per division
--            - Auto-moves members when division changes
--            - Archives membership history
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Extend conversations table
-- ─────────────────────────────────────────────────────────────────────────────

-- Add division column (nullable — only populated for division_group rows)
alter table conversations
  add column if not exists division division_type;

-- Drop existing conversation_type check constraint so we can extend it
-- The original constraint only allowed: direct, program_group
alter table conversations
  drop constraint if exists conversations_conversation_type_check;

-- Add updated constraint that also allows division_group
alter table conversations
  add constraint conversations_conversation_type_check
  check (conversation_type in ('direct', 'program_group', 'division_group'));

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: ensure_division_channel(p_division)
-- Returns the id of the single division_group conversation for a given division.
-- Creates it if it doesn't exist. Safe to call multiple times (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function ensure_division_channel(p_division division_type)
returns uuid
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_id       uuid;
  v_title    text;
  v_admin_id uuid;
begin
  -- Resolve friendly channel title from division enum value
  v_title := case p_division
    when 'amateur'       then 'Amateur Group'
    when 'semi_pro'      then 'Semi-Pro Group'
    when 'pro'           then 'Pro Group'
    when 'junior_9_11'   then 'Juniors 9–11'
    when 'junior_12_15'  then 'Juniors 12–15'
    when 'junior_15_18'  then 'Juniors 15–18'
    else p_division::text || ' Group'   -- fallback for future divisions
  end;

  -- Try to find an existing channel for this division
  select id into v_id
  from conversations
  where conversation_type = 'division_group'
    and division = p_division
  limit 1;

  -- If not found, create it
  if v_id is null then
    -- Prefer a super_admin as creator; falls back to null if none exists
    select id into v_admin_id
    from profiles
    where role = 'super_admin'
    limit 1;

    insert into conversations (
      is_group,
      title,
      conversation_type,
      division,
      created_by
    ) values (
      true,
      v_title,
      'division_group',
      p_division,
      v_admin_id
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$func$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: conversation_member_archive
-- Preserves a historical record of division-channel membership.
-- Written to when a student's division changes.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists conversation_member_archive (
  conversation_id uuid        not null references conversations(id) on delete cascade,
  profile_id      uuid        not null references profiles(id)      on delete cascade,
  division        division_type,          -- division at time of archival
  joined_at       timestamptz,            -- original joined_at from conversation_members
  left_at         timestamptz not null default now(),
  reason          text        not null default 'division_change',
  primary key (conversation_id, profile_id, left_at)
);

alter table conversation_member_archive enable row level security;

-- Only admins and super_admins may view the archive
-- Note: CREATE POLICY does not support IF NOT EXISTS; use DO block for idempotency
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'conversation_member_archive'
      and policyname = 'Admins see archive'
  ) then
    execute 'create policy "Admins see archive"
      on conversation_member_archive
      for select
      using (get_my_role() in (''admin'', ''super_admin''))';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: sync_division_channel_membership() — trigger function
-- Fires after a student's division column is updated.
-- Handles all transition cases:
--   NULL    → division   : join new channel
--   division → NULL      : archive + leave old channel, no new channel
--   division → division  : archive + leave old, join new, notify
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function sync_division_channel_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_old_conv_id uuid;
  v_new_conv_id uuid;
  v_joined_at   timestamptz;
  v_div_name    text;
begin
  -- Nothing to do if division did not change
  if OLD.division is not distinct from NEW.division then
    return NEW;
  end if;

  -- ── 1. Archive & remove from OLD division channel ────────────────────────
  if OLD.division is not null then
    -- Find the old division channel
    select id into v_old_conv_id
    from conversations
    where conversation_type = 'division_group'
      and division = OLD.division
    limit 1;

    if v_old_conv_id is not null then
      -- Capture the original joined_at before deleting
      select joined_at into v_joined_at
      from conversation_members
      where conversation_id = v_old_conv_id
        and profile_id = NEW.id;

      -- Archive the membership row (only if it existed)
      if v_joined_at is not null then
        insert into conversation_member_archive (
          conversation_id,
          profile_id,
          division,
          joined_at,
          left_at,
          reason
        ) values (
          v_old_conv_id,
          NEW.id,
          OLD.division,
          v_joined_at,
          now(),
          'division_change'
        )
        on conflict do nothing;  -- left_at is part of PK; race-safe
      end if;

      -- Remove from old division channel
      delete from conversation_members
      where conversation_id = v_old_conv_id
        and profile_id = NEW.id;
    end if;
  end if;

  -- ── 2. Add to NEW division channel ───────────────────────────────────────
  if NEW.division is not null then
    -- Ensure channel exists (creates it if missing)
    v_new_conv_id := ensure_division_channel(NEW.division);

    -- Add member (ignore if already a member — shouldn't happen but be safe)
    insert into conversation_members (conversation_id, profile_id, joined_at)
    values (v_new_conv_id, NEW.id, now())
    on conflict do nothing;

    -- ── 3. Send in-app notification ─────────────────────────────────────────
    -- Resolve a friendly channel name for the notification body
    v_div_name := case NEW.division
      when 'amateur'       then 'Amateur Group'
      when 'semi_pro'      then 'Semi-Pro Group'
      when 'pro'           then 'Pro Group'
      when 'junior_9_11'   then 'Juniors 9–11'
      when 'junior_12_15'  then 'Juniors 12–15'
      when 'junior_15_18'  then 'Juniors 15–18'
      else NEW.division::text || ' Group'
    end;

    insert into notifications (
      recipient_id,
      title,
      body,
      type
    ) values (
      NEW.id,
      '📣 You have been moved to a new group!',
      'You have been added to the ' || v_div_name || ' channel. Welcome! 🎾',
      'system'
    );
  end if;

  return NEW;
end;
$func$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Trigger on profiles
-- ─────────────────────────────────────────────────────────────────────────────

drop trigger if exists sync_division_channel on profiles;

create trigger sync_division_channel
  after update of division on profiles
  for each row
  execute function sync_division_channel_membership();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: RLS — replace "Members see own conversations" policy
-- Splits logic by conversation_type:
--   division_group → visible if coach/admin OR user's division matches
--   everything else → existing is_conversation_member() check
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing policy (name may vary — we try the known name)
drop policy if exists "Members see own conversations" on conversations;

create policy "Members see own conversations"
  on conversations
  for select
  using (
    case conversation_type
      when 'division_group' then (
        -- Coaches/admins/super_admins oversee all division channels
        get_my_role() in ('coach', 'admin', 'super_admin')
        or
        -- Students only see the channel for their own division
        (
          select division
          from profiles
          where id = auth.uid()
        ) = division
      )
      else
        -- Direct messages and program groups use the existing member check
        is_conversation_member(id)
    end
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: Backfill existing users into division channels
-- - Creates all 6 division channels (via ensure_division_channel)
-- - Adds each student to their division channel
-- - Adds all coaches/admins/super_admins to every division channel
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  div           division_type;
  conv_id       uuid;
  divisions     division_type[] := array[
    'amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'
  ]::division_type[];
  staff_role    record;
  student_rec   record;
begin
  -- ── Step 7a: Ensure all 6 channels exist ──────────────────────────────────
  foreach div in array divisions loop
    conv_id := ensure_division_channel(div);

    -- ── Step 7b: Add students with this division ───────────────────────────
    for student_rec in
      select id
      from profiles
      where role = 'student'
        and division = div
    loop
      insert into conversation_members (conversation_id, profile_id, joined_at)
      values (conv_id, student_rec.id, now())
      on conflict do nothing;
    end loop;
  end loop;

  -- ── Step 7c: Add coaches/admins/super_admins to ALL division channels ─────
  -- Staff oversee every division, so they join all 6 channels
  for staff_role in
    select id
    from profiles
    where role in ('coach', 'admin', 'super_admin')
  loop
    foreach div in array divisions loop
      -- Get the channel id (already created above)
      select id into conv_id
      from conversations
      where conversation_type = 'division_group'
        and division = div
      limit 1;

      if conv_id is not null then
        insert into conversation_members (conversation_id, profile_id, joined_at)
        values (conv_id, staff_role.id, now())
        on conflict do nothing;
      end if;
    end loop;
  end loop;
end;
$$;
-- =============================================================================
-- Migration: 20260328000004_division_channel_indexes
-- Purpose:   Performance indexes for division channel queries
-- =============================================================================

-- Speed up lookups like: WHERE division = 'amateur' AND conversation_type = 'division_group'
create index if not exists idx_conversations_division
  on conversations(division);

-- Speed up filtering conversations by type (direct / program_group / division_group)
create index if not exists idx_conversations_type
  on conversations(conversation_type);

-- Speed up archive queries by profile (e.g. "show my membership history")
create index if not exists idx_conv_member_archive_profile
  on conversation_member_archive(profile_id);
-- =============================================
-- Migration: pg_cron schedules for edge functions
-- 2026-03-28
-- =============================================
-- Schedules 4 edge functions via pg_cron + pg_net:
--   1. process-notifications  — every 2 minutes
--   2. session-reminders      — every hour
--   3. weekly-summary         — Mondays at 08:00 UTC
--   4. evaluate-promotion-cycles — every hour (on the hour)
--
-- Requires: pg_cron + pg_net extensions enabled in Supabase
-- =============================================

-- Remove existing schedules if they exist (idempotent)
SELECT cron.unschedule('process-notifications')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notifications');
SELECT cron.unschedule('session-reminders')        WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'session-reminders');
SELECT cron.unschedule('weekly-summary')           WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-summary');
SELECT cron.unschedule('evaluate-promotion-cycles') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-promotion-cycles');

-- 1. process-notifications: every 2 minutes
-- Picks up push_sent=false notifications and delivers push + email
SELECT cron.schedule(
  'process-notifications',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/process-notifications',
    headers := '{"Authorization": "Bearer sb_secret_Ti470YHzM_Hxvxz8GTfSzw_SfQKW5qC", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 2. session-reminders: every hour
-- Finds sessions starting in ~24h and notifies enrolled students
SELECT cron.schedule(
  'session-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/session-reminders',
    headers := '{"Authorization": "Bearer sb_secret_Ti470YHzM_Hxvxz8GTfSzw_SfQKW5qC", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3. weekly-summary: every Monday at 08:00 UTC
-- Sends weekly digest email to all admins
SELECT cron.schedule(
  'weekly-summary',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/weekly-summary',
    headers := '{"Authorization": "Bearer sb_secret_Ti470YHzM_Hxvxz8GTfSzw_SfQKW5qC", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 4. evaluate-promotion-cycles: every hour (at :30 past, offset from session-reminders)
-- Checks active promotion cycles and flips eligible students
SELECT cron.schedule(
  'evaluate-promotion-cycles',
  '30 * * * *',
  $$SELECT evaluate_all_promotion_cycles()$$
);
-- =============================================
-- Migration: Fix DM creation RLS for students
-- 2026-03-28
-- =============================================
-- Problem: students cannot initiate a direct message
-- to a coach because the conversations INSERT policy
-- only allowed coach/admin/super_admin.
--
-- Fix:
--   1. Allow any authenticated user to INSERT a 'direct'
--      conversation (students + coaches). Group/division
--      channels remain restricted to coaches/admins/system.
--   2. conversation_members INSERT: keep existing logic but
--      explicitly allow the conversation creator to add the
--      initial two members (themselves + recipient).
-- =============================================

-- ── 1. Fix conversations INSERT policy ───────────────────────
DROP POLICY IF EXISTS "Coaches and admins can create conversations" ON conversations;
DROP POLICY IF EXISTS "Coaches can create direct conversations" ON conversations;

CREATE POLICY "Users can create direct conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Any authenticated user can create a direct DM
      conversation_type = 'direct'
      OR
      -- Only coaches/admins/super_admin can create group/division channels
      get_my_role() IN ('coach', 'admin', 'super_admin')
    )
  );

-- ── 2. conversation_members INSERT policy is already correct ─
-- It allows: auth.uid() = profile_id (self-insert)
--         OR is_conversation_creator() (creator adds others)
--         OR coach/admin/super_admin
-- This works correctly once students can create the conversation.
-- No change needed — leaving a comment for clarity.

-- ── Verify ───────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations'
      AND cmd = 'INSERT'
      AND policyname = 'Users can create direct conversations'
  ), 'Policy not created';
  RAISE NOTICE 'Fix verified: students can now create direct conversations';
END;
$$;
-- =============================================
-- Migration: Atomic DM creation via RPC
-- 2026-03-28
-- =============================================
-- Problem: inserting a conversation then calling .select()
-- fails because PostgREST re-checks the SELECT policy
-- (is_conversation_member) immediately after INSERT —
-- but the members haven't been inserted yet, so the
-- new row is invisible and PostgREST throws an RLS error.
--
-- Fix: security definer function that creates the
-- conversation AND adds both members in one atomic
-- transaction, bypassing RLS entirely. Returns the
-- conversation id to the caller.
-- =============================================

CREATE OR REPLACE FUNCTION create_direct_conversation(p_recipient_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id        uuid := auth.uid();
  v_conv_id      uuid;
  v_existing_id  uuid;
BEGIN
  -- Must be authenticated
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Cannot DM yourself
  IF v_my_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  -- Check if a direct conversation already exists between the two users
  SELECT cm1.conversation_id INTO v_existing_id
  FROM conversation_members cm1
  JOIN conversation_members cm2
    ON cm2.conversation_id = cm1.conversation_id
   AND cm2.profile_id = p_recipient_id
  JOIN conversations c
    ON c.id = cm1.conversation_id
   AND c.conversation_type = 'direct'
  WHERE cm1.profile_id = v_my_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Create the conversation
  INSERT INTO conversations (is_group, conversation_type, created_by)
  VALUES (false, 'direct', v_my_id)
  RETURNING id INTO v_conv_id;

  -- Add both members atomically
  INSERT INTO conversation_members (conversation_id, profile_id)
  VALUES
    (v_conv_id, v_my_id),
    (v_conv_id, p_recipient_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conv_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_direct_conversation(uuid) TO authenticated;
-- =============================================
-- Migration: Fix notify_new_message trigger
-- 2026-03-28
-- =============================================
-- Bug: trigger references conversation_members.user_id
-- which doesn't exist — correct column is profile_id.
-- This caused every message INSERT to throw:
--   ERROR: 42703: column "user_id" does not exist
-- =============================================

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_id   UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  FOR member_id IN
    SELECT profile_id FROM conversation_members
    WHERE conversation_id = NEW.conversation_id
      AND profile_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      member_id,
      'New message from ' || COALESCE(sender_name, 'Someone'),
      LEFT(NEW.content, 100),
      'new_message',
      jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;
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
-- =====================================================================
-- Fix: email_notifications_enabled defaults to TRUE for all new users
-- Previously had no default → NULL → emails silently skipped
-- =====================================================================

-- Set default to TRUE so all new profiles get emails enabled
ALTER TABLE profiles
  ALTER COLUMN email_notifications_enabled SET DEFAULT TRUE;

-- Backfill existing users where it is NULL
UPDATE profiles
SET email_notifications_enabled = TRUE
WHERE email_notifications_enabled IS NULL;
-- =====================================================================
-- Fix: Send welcome notification to new student on registration
-- Previously only notified admins; student received nothing.
-- Also fixes enrollment notification to include program name clearly.
-- =====================================================================

-- Updated registration trigger: notify student (welcome) + admins
CREATE OR REPLACE FUNCTION notify_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Welcome notification to the new student themselves
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.id,
    'Welcome to BPT Academy! 🎾',
    'Hi ' || COALESCE(NEW.full_name, 'there') || '! Your account has been created. You can now browse programs and enroll. Welcome to the academy!',
    'welcome',
    jsonb_build_object('student_id', NEW.id)
  );

  -- Notify all admins
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      admin_id,
      'New student registered',
      COALESCE(NEW.full_name, 'A new student') || ' just joined BPT Academy',
      'admin_new_registration',
      jsonb_build_object('student_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_registration ON profiles;
CREATE TRIGGER on_new_registration
  AFTER INSERT ON profiles
  FOR EACH ROW WHEN (NEW.role = 'student')
  EXECUTE FUNCTION notify_new_registration();

-- Updated enrollment trigger: clearer message with program name
CREATE OR REPLACE FUNCTION notify_new_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
  program_title TEXT;
  admin_id UUID;
BEGIN
  SELECT full_name INTO student_name FROM profiles WHERE id = NEW.student_id;
  SELECT title INTO program_title FROM programs WHERE id = NEW.program_id;

  -- Notify the student
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    'Enrollment confirmed 🎾',
    'You''ve been successfully enrolled in ' || COALESCE(program_title, 'a program') || '. See you on the court!',
    'enrollment_confirmed',
    jsonb_build_object('program_id', NEW.program_id)
  );

  -- Notify all admins
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      admin_id,
      'New enrollment',
      COALESCE(student_name, 'A student') || ' enrolled in ' || COALESCE(program_title, 'a program'),
      'admin_new_enrollment',
      jsonb_build_object('program_id', NEW.program_id, 'student_id', NEW.student_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_enrollment ON enrollments;
CREATE TRIGGER on_new_enrollment
  AFTER INSERT ON enrollments
  FOR EACH ROW EXECUTE FUNCTION notify_new_enrollment();
-- =============================================
-- Migration: fix video upload RLS + storage policy
-- 2026-04-02
-- =============================================

-- ── Storage: add super_admin to upload policy ──────────────────
drop policy if exists "Coaches can upload videos" on storage.objects;
create policy "Coaches can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'training-videos' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

drop policy if exists "Coaches can delete videos" on storage.objects;
create policy "Coaches can delete videos"
  on storage.objects for delete
  using (
    bucket_id = 'training-videos' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

-- ── videos table: ensure insert/update policies include super_admin ──
drop policy if exists "Coaches can insert videos" on videos;
create policy "Coaches can insert videos"
  on videos for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

drop policy if exists "Coaches can update videos" on videos;
create policy "Coaches can update videos"
  on videos for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

drop policy if exists "Admins can delete videos" on videos;
create policy "Admins can delete videos"
  on videos for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );
-- ============================================================
-- Parent / Junior Account System
-- ============================================================

-- 1. Add parent to user_role enum (if not exists)
-- NOTE: 'parent' may already exist in the enum. Use DO block to check first.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'parent' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'parent';
  END IF;
END $$;

-- 2. Add columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS parent_email text,
  ADD COLUMN IF NOT EXISTS child_email text,
  ADD COLUMN IF NOT EXISTS child_auth_id uuid,
  ADD COLUMN IF NOT EXISTS is_junior boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS graduated_at timestamptz;

-- 3. parent_access table
CREATE TABLE IF NOT EXISTS parent_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- 4. RLS on parent_access
ALTER TABLE parent_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parent_access' AND policyname = 'Parents can see their own links'
  ) THEN
    CREATE POLICY "Parents can see their own links"
      ON parent_access FOR SELECT
      USING (parent_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parent_access' AND policyname = 'Admins manage parent access'
  ) THEN
    CREATE POLICY "Admins manage parent access"
      ON parent_access FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      );
  END IF;
END $$;

-- 5. Parents can read their children's profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Parents can view their children'
  ) THEN
    CREATE POLICY "Parents can view their children"
      ON profiles FOR SELECT
      USING (
        id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 6. Parents can read their children's enrollments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'Parents can view children enrollments'
  ) THEN
    CREATE POLICY "Parents can view children enrollments"
      ON enrollments FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 7. Parents can insert enrollments for children
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'Parents can enroll children'
  ) THEN
    CREATE POLICY "Parents can enroll children"
      ON enrollments FOR INSERT
      WITH CHECK (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 8. Parents can view children's attendance
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'session_attendance' AND policyname = 'Parents can view children attendance'
  ) THEN
    CREATE POLICY "Parents can view children attendance"
      ON session_attendance FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 9. Parents can view children's progress
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'student_progress' AND policyname = 'Parents can view children progress'
  ) THEN
    CREATE POLICY "Parents can view children progress"
      ON student_progress FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 10. Parents can view children's coach notes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coach_notes' AND policyname = 'Parents can view children coach notes'
  ) THEN
    CREATE POLICY "Parents can view children coach notes"
      ON coach_notes FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 11. Parents can view/insert payments for children
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Parents can view children payments'
  ) THEN
    CREATE POLICY "Parents can view children payments"
      ON payments FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 12. Auto-graduation function
CREATE OR REPLACE FUNCTION graduate_junior_to_student(p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET role = 'student',
      is_junior = false,
      graduated_at = now()
  WHERE id = p_student_id
    AND is_junior = true
    AND date_of_birth <= (current_date - interval '16 years');

  INSERT INTO notifications (recipient_id, title, body, type)
  VALUES (
    p_student_id,
    '🎉 Welcome to the main division!',
    'You''ve turned 16 — your account has been upgraded to a full student account. You can now log in independently.',
    'system'
  );
END;
$$;
-- ============================================================
-- Fix: RLS recursion between profiles and parent_access
-- ============================================================
-- The "Admins manage parent access" policy on parent_access
-- queries profiles, which re-triggers the profiles SELECT policy
-- "Parents can view their children", which queries parent_access
-- → infinite recursion → profile fetch fails → blank app.
--
-- Fix: use get_my_role() (SECURITY DEFINER, bypasses RLS)
-- instead of querying profiles directly.
-- ============================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins manage parent access" ON parent_access;

-- Recreate using get_my_role() to avoid recursion
CREATE POLICY "Admins manage parent access"
  ON parent_access FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'));
-- ============================================================
-- Fix: infinite recursion in profiles RLS
-- ============================================================
-- The "Parents can view their children" policy on profiles
-- causes infinite recursion because:
--   profiles SELECT → parent_access → profiles SELECT → ...
--
-- Root fix: drop the recursive policy entirely and replace all
-- admin-check policies on parent_access with a security definer
-- function that reads from auth.jwt() (no table queries at all).
-- ============================================================

-- 1. Create a security definer function that checks role from
--    auth.users metadata — ZERO table queries, no RLS involved.
CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role',
    'student'
  ) IN ('admin', 'super_admin');
$$;

-- 2. Drop the broken recursive policy on profiles
DROP POLICY IF EXISTS "Parents can view their children" ON profiles;

-- 3. Recreate it using a security definer function to avoid recursion.
--    We need a separate function that queries parent_access without
--    triggering profiles RLS.
CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT student_id FROM parent_access WHERE parent_id = auth.uid();
$$;

CREATE POLICY "Parents can view their children"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT get_my_children_ids())
  );

-- 4. Fix parent_access admin policy to not query profiles
DROP POLICY IF EXISTS "Admins manage parent access" ON parent_access;

CREATE POLICY "Admins manage parent access"
  ON parent_access FOR ALL
  USING (is_admin_or_super());
-- ============================================================
-- Fix: get_my_role() causes infinite recursion
-- ============================================================
-- get_my_role() queries profiles table directly, which triggers
-- profiles RLS policies, which call get_my_role() → infinite loop.
--
-- Fix: rewrite get_my_role() to read from auth.users metadata
-- (JWT claims) — zero table queries, no RLS involved.
--
-- Also: drop the "Parents can view their children" policy entirely
-- for now — it's the policy that introduced the recursion.
-- Parents can still be re-added safely later once the base RLS
-- is stable.
-- ============================================================

-- 1. Fix get_my_role() to use JWT claims instead of querying profiles
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role',
    'student'
  );
$$;

-- 2. Drop ALL problematic policies on profiles that reference profiles
--    (the recursive ones)
DROP POLICY IF EXISTS "Parents can view their children" ON profiles;
DROP POLICY IF EXISTS "Admins manage parent access" ON parent_access;
DROP POLICY IF EXISTS "Parents can see their own links" ON parent_access;

-- 3. Recreate parent_access policies cleanly (no profiles queries)
CREATE POLICY "Parents can see their own links"
  ON parent_access FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Admins manage parent access"
  ON parent_access FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'));

-- 4. Recreate parents-view-children policy using security definer
--    function that bypasses RLS on parent_access
CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT student_id FROM parent_access WHERE parent_id = auth.uid();
$$;

CREATE POLICY "Parents can view their children"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT get_my_children_ids())
  );
-- ============================================================
-- Fix: get_my_role() recursion — use SET row_security = off
-- ============================================================
-- get_my_role() is SECURITY DEFINER (runs as postgres/superuser)
-- but still triggers RLS recursion when profiles policies call it
-- while profiles is being evaluated.
--
-- Fix: add SET row_security = off to the function definition.
-- This tells Postgres to skip RLS entirely when executing the
-- function body — safe because the function is SECURITY DEFINER
-- and owned by postgres (which has BYPASSRLS privilege).
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(role::text, 'student')
  FROM profiles
  WHERE id = auth.uid();
$$;

-- Also ensure get_my_children_ids() has row_security off
CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT student_id FROM parent_access WHERE parent_id = auth.uid();
$$;

-- Ensure is_admin_or_super() (created in 000003) also has it
CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(role::text, 'student') IN ('admin', 'super_admin')
  FROM profiles
  WHERE id = auth.uid();
$$;

-- Re-ensure the parents policy uses the safe function
DROP POLICY IF EXISTS "Parents can view their children" ON profiles;

CREATE POLICY "Parents can view their children"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT get_my_children_ids())
  );
-- ============================================================
-- DEFINITIVE FIX: Break the RLS recursion loop
-- ============================================================
-- Root cause:
--   profiles SELECT policy "Parents can view their children"
--   → calls get_my_children_ids()
--   → queries parent_access
--   → evaluates "Admins manage parent access" policy
--   → calls get_my_role()
--   → queries profiles
--   → INFINITE RECURSION
--
-- Fix: rewrite get_my_role() to use JWT claims (no table query).
-- For existing users whose role is not in JWT metadata, we use
-- a security definer function on a DIFFERENT table (auth.users)
-- which has no RLS policies.
--
-- Also: drop and cleanly recreate the parent_access admin policy
-- using JWT claims directly — no profiles query at all.
-- ============================================================

-- 1. Rewrite get_my_role() to read from auth.users (no RLS on auth schema)
--    auth.users is accessible to SECURITY DEFINER functions owned by postgres.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Try raw_app_meta_data first (set by admin API / trigger)
  SELECT raw_app_meta_data->>'role'
  INTO v_role
  FROM auth.users
  WHERE id = auth.uid();

  -- Fall back to raw_user_meta_data (set at signup)
  IF v_role IS NULL OR v_role = '' THEN
    SELECT raw_user_meta_data->>'role'
    INTO v_role
    FROM auth.users
    WHERE id = auth.uid();
  END IF;

  RETURN COALESCE(v_role, 'student');
END;
$$;

-- 2. Rewrite get_my_children_ids() to also use auth.users
--    (parent_access has no recursion issue since it doesn't trigger profiles policies)
CREATE OR REPLACE FUNCTION get_my_children_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT student_id FROM parent_access WHERE parent_id = auth.uid();
$$;

-- 3. Drop all existing parent_access policies and recreate cleanly
DROP POLICY IF EXISTS "Parents can see their own links"  ON parent_access;
DROP POLICY IF EXISTS "Admins manage parent access"      ON parent_access;

CREATE POLICY "Parents can see their own links"
  ON parent_access FOR SELECT
  USING (parent_id = auth.uid());

-- Admin policy now uses get_my_role() which reads auth.users (no RLS recursion)
CREATE POLICY "Admins manage parent access"
  ON parent_access FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'));

-- 4. Drop and recreate the profiles parent policy
DROP POLICY IF EXISTS "Parents can view their children" ON profiles;

CREATE POLICY "Parents can view their children"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT get_my_children_ids())
  );

-- 5. Update handle_new_user to also set app_metadata role
--    so future logins have role in JWT (faster path)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role      user_role;
  v_division  division_type;
  v_skill     skill_level;
  v_div_text  text;
  v_skill_text text;
BEGIN
  -- Role
  BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'student')::user_role;
  EXCEPTION WHEN others THEN
    v_role := 'student';
  END;

  -- Division (safe cast)
  v_div_text := new.raw_user_meta_data->>'division';
  BEGIN
    IF v_div_text IS NOT NULL AND v_div_text <> '' THEN
      v_division := v_div_text::division_type;
    END IF;
  EXCEPTION WHEN others THEN
    v_division := null;
  END;

  -- Skill level (safe cast)
  v_skill_text := new.raw_user_meta_data->>'skill_level';
  BEGIN
    IF v_skill_text IS NOT NULL AND v_skill_text <> '' THEN
      v_skill := v_skill_text::skill_level;
    END IF;
  EXCEPTION WHEN others THEN
    v_skill := null;
  END;

  INSERT INTO public.profiles (id, full_name, role, phone, division, skill_level)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone',
    v_division,
    v_skill
  )
  ON CONFLICT (id) DO UPDATE SET
    division    = COALESCE(excluded.division,    profiles.division),
    skill_level = COALESCE(excluded.skill_level, profiles.skill_level);

  -- Also stamp role into app_metadata so get_my_role() works from JWT
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role::text)
  WHERE id = new.id;

  RETURN new;
END;
$$;
