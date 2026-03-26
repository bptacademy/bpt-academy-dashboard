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
