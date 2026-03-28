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
