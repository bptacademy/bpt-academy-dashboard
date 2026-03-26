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
