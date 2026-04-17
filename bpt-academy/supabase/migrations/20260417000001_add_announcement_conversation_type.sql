-- Allow 'announcement' as a valid conversation_type
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_conversation_type_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_conversation_type_check
  CHECK (conversation_type IN ('direct', 'program_group', 'division_group', 'announcement'));
