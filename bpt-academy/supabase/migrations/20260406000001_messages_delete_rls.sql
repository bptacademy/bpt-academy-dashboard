-- ── Messages: DELETE policy ────────────────────────────────────────────────
-- Mobile app uses the anon key so RLS applies.
-- Allow:
--   • the message sender to delete their own message
--   • coaches, admins, and super_admins to delete any message in
--     conversations they are a member of

create policy "Senders and admins can delete messages"
  on messages for delete
  using (
    auth.uid() = sender_id
    or (
      get_my_role() in ('coach', 'admin', 'super_admin')
      and is_conversation_member(conversation_id)
    )
  );
