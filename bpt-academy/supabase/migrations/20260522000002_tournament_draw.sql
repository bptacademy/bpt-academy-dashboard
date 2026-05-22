-- Tournament Draw: partner/seed/team columns + match team linking

-- Add partner, team_name, seed to tournament_registrations
ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_name text,
  ADD COLUMN IF NOT EXISTS seed integer;

-- Add team registration links and notes to tournament_matches
ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS team1_registration_id uuid REFERENCES tournament_registrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team2_registration_id uuid REFERENCES tournament_registrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text;

-- Allow coaches/admins to delete registrations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tournament_registrations'
      AND policyname = 'Admins can delete registrations'
  ) THEN
    CREATE POLICY "Admins can delete registrations"
      ON tournament_registrations
      FOR DELETE
      TO authenticated
      USING (
        ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)
        = ANY (ARRAY['admin'::text, 'super_admin'::text, 'coach'::text])
      );
  END IF;
END $$;
