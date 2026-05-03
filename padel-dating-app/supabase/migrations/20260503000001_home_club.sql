-- Add home club fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS home_club_id uuid REFERENCES clubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS home_club_name text;

-- Index for club member lookups (leaderboard etc.)
CREATE INDEX IF NOT EXISTS idx_users_home_club_id ON users(home_club_id);

COMMENT ON COLUMN users.home_club_id IS 'FK to clubs — the club this user calls home';
COMMENT ON COLUMN users.home_club_name IS 'Denormalised club name for fast display without JOIN';
