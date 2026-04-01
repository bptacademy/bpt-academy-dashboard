-- =====================================================================
-- Fix: email_notifications_enabled defaults to TRUE for all new users
-- Previously had no default → NULL → emails silently skipped
-- =====================================================================

-- Set default to TRUE so all new profiles get emails enabled
ALTER TABLE profiles
  ALTER COLUMN email_notifications_enabled SET DEFAULT TRUE;

-- Backfill existing users where it is NULL
UPDATE profiles
SET email_notifications_enabled = TRUE
WHERE email_notifications_enabled IS NULL;
