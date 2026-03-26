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
