-- =====================================================================
-- pg_cron: Schedule notification edge functions
-- NOTE: The actual HTTP Authorization header with the service role key
-- is applied separately via psql (not committed to git for security).
-- This migration just ensures pg_net is enabled and removes old jobs.
-- Run setup-cron.sh to register the actual schedules.
-- =====================================================================

-- Enable pg_net (required for HTTP calls from pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing schedules with these names to avoid duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notifications') THEN
    PERFORM cron.unschedule('process-notifications');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'session-reminders') THEN
    PERFORM cron.unschedule('session-reminders');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-summary') THEN
    PERFORM cron.unschedule('weekly-summary');
  END IF;
END $$;
