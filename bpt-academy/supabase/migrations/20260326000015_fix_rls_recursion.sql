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
