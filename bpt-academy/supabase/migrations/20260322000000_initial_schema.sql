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
