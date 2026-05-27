-- Tournament Draws + Guest Registrations
-- Adds gender draw support and guest player registration

-- 1. Add draws array to tournaments (declares which draws this tournament has)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS draws text[] DEFAULT ARRAY['mens','womens'];

-- 2. Add draw column to tournament_registrations
ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS draw text CHECK (draw IN ('mens', 'womens', 'mixed')) DEFAULT 'mens';

-- 3. Add draw column to tournament_matches
ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS draw text CHECK (draw IN ('mens', 'womens', 'mixed')) DEFAULT 'mens';

-- 4. Guest registrations table (players without a BPT Academy account)
CREATE TABLE IF NOT EXISTS tournament_guest_registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  full_name         text NOT NULL,
  email             text NOT NULL,
  draw              text NOT NULL CHECK (draw IN ('mens', 'womens', 'mixed')) DEFAULT 'mens',
  partner_name      text,           -- optional partner for doubles
  seed              integer,
  status            text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'withdrawn')),
  registered_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notified_at       timestamptz,    -- when invite email was sent
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, email)
);

-- 5. RLS for guest registrations
ALTER TABLE tournament_guest_registrations ENABLE ROW LEVEL SECURITY;

-- Admins/coaches/super_admins can do everything
CREATE POLICY "Admins can manage guest registrations"
  ON tournament_guest_registrations
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin', 'coach')
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin', 'coach')
  );

-- Students/coaches can read guest registrations for any tournament
CREATE POLICY "Authenticated users can read guest registrations"
  ON tournament_guest_registrations
  FOR SELECT
  TO authenticated
  USING (true);
