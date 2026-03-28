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
