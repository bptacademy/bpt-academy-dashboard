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
