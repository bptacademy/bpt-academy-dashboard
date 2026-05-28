-- Allow any authenticated user to see confirmed tournament registrations
-- This fixes the "0 / 64 registered" bug on TournamentDetailScreen for non-registered students
-- Students were previously only allowed to see their own registration row (RLS blocked count queries)

DROP POLICY IF EXISTS "Students can see all confirmed registrations" ON tournament_registrations;

CREATE POLICY "Students can see all confirmed registrations"
  ON tournament_registrations FOR SELECT
  USING (status = 'confirmed');
