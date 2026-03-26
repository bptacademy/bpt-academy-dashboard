-- BPT Academy schema backup (pre-migration)
-- Generated: Thu Mar 26 08:09:52 GMT 2026
-- Contains all migrations up to 20260322000016 (last applied remote state)

-- === supabase/migrations/20260322000000_initial_schema.sql ===
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

-- === supabase/migrations/20260322000001_fix_user_trigger.sql ===
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

-- === supabase/migrations/20260322000002_fix_rls_policies.sql ===
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

-- === supabase/migrations/20260322000003_storage_policies.sql ===
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

-- === supabase/migrations/20260322000004_fix_video_rls.sql ===
-- Drop the existing restrictive video select policy
drop policy if exists "Authenticated users can view published videos" on videos;

-- Recreate with correct check: any logged-in user can view published videos
create policy "Authenticated users can view published videos"
  on videos for select
  using (
    is_published = true
    and auth.uid() is not null
  );

-- === supabase/migrations/20260322000005_fix_comments_rls.sql ===
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

-- === supabase/migrations/20260322000006_avatar_storage.sql ===
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

-- === supabase/migrations/20260322000007_messaging_rls.sql ===
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

-- === supabase/migrations/20260322000008_phase1_divisions.sql ===
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

-- === supabase/migrations/20260322000009_remove_competition.sql ===
-- Update any existing 'competition' skill levels to 'advanced'
update profiles set skill_level = 'advanced' where skill_level = 'competition';

-- Update programs too
update programs set skill_level = 'advanced' where skill_level = 'competition';

-- === supabase/migrations/20260322000010_nullable_skill_level.sql ===
-- Make skill_level nullable since Semi-Pro and Pro don't have sub-levels
alter table programs alter column skill_level drop not null;

-- === supabase/migrations/20260322000011_academy_settings.sql ===
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

-- === supabase/migrations/20260322000012_stripe_publishable_key.sql ===
insert into academy_settings (key, value) values
  ('stripe_publishable_key', 'pk_live_51SQF2UCryzcsryG9zluIixJqTmQWDHUGXb8RHDvAXRxDj4TLl15h9GozGnrDz9T0deLT5mZwOWr4cnrB87WmyaNI00LiUT7BL5')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- === supabase/migrations/20260322000013_payment_links.sql ===
insert into academy_settings (key, value) values
  ('stripe_payment_link_amateur', 'https://buy.stripe.com/bJeaEW6fN90geZM2IPffy02')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- === supabase/migrations/20260322000014_profiles_messaging_rls.sql ===
-- Ensure all authenticated users can read basic profile info
-- (needed for messaging — admins listing students, students listing coaches)
drop policy if exists "Authenticated users can read profiles" on profiles;

create policy "Authenticated users can read profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

-- === supabase/migrations/20260322000015_program_coaches.sql ===
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

-- === supabase/migrations/20260322000016_program_price.sql ===
alter table programs add column if not exists price_gbp numeric(10,2) default null;

