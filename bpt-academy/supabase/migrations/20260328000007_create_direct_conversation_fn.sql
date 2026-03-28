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
