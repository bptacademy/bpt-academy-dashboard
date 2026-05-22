-- Allow coaches/admins/super_admins to delete rows from program_waiting_list
-- Previously only students could delete (their own rows), which silently blocked
-- coach approve/remove actions via RLS, causing deleted entries to reappear on reload.

CREATE POLICY "Coaches manage waitlist"
  ON program_waiting_list
  FOR DELETE
  TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)
    = ANY (ARRAY['coach'::text, 'admin'::text, 'super_admin'::text])
  );
