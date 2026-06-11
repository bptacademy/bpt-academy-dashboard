-- Add ban columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned       boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at       timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ban_reason      text;

-- Index for quick lookup of banned users
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = true;
