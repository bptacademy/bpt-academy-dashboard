-- =============================================
-- Migration: Fix notify_new_message trigger
-- 2026-03-28
-- =============================================
-- Bug: trigger references conversation_members.user_id
-- which doesn't exist — correct column is profile_id.
-- This caused every message INSERT to throw:
--   ERROR: 42703: column "user_id" does not exist
-- =============================================

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_id   UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  FOR member_id IN
    SELECT profile_id FROM conversation_members
    WHERE conversation_id = NEW.conversation_id
      AND profile_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      member_id,
      'New message from ' || COALESCE(sender_name, 'Someone'),
      LEFT(NEW.content, 100),
      'new_message',
      jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;
