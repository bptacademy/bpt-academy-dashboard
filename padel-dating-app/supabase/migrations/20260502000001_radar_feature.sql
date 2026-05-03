-- Enable earthdistance for radius queries
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Add radar fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_lat double precision,
  ADD COLUMN IF NOT EXISTS last_lon double precision,
  ADD COLUMN IF NOT EXISTS last_location_at timestamptz,
  ADD COLUMN IF NOT EXISTS radar_visible boolean NOT NULL DEFAULT true;

-- Index for fast radius queries
CREATE INDEX IF NOT EXISTS idx_users_location ON users USING gist (ll_to_earth(last_lat, last_lon))
  WHERE radar_visible = true AND last_lat IS NOT NULL AND last_lon IS NOT NULL;
