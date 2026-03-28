-- =============================================
-- Migration: pg_cron schedules for edge functions
-- 2026-03-28
-- =============================================
-- Schedules 4 edge functions via pg_cron + pg_net:
--   1. process-notifications  — every 2 minutes
--   2. session-reminders      — every hour
--   3. weekly-summary         — Mondays at 08:00 UTC
--   4. evaluate-promotion-cycles — every hour (on the hour)
--
-- Requires: pg_cron + pg_net extensions enabled in Supabase
-- =============================================

-- Remove existing schedules if they exist (idempotent)
SELECT cron.unschedule('process-notifications')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notifications');
SELECT cron.unschedule('session-reminders')        WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'session-reminders');
SELECT cron.unschedule('weekly-summary')           WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-summary');
SELECT cron.unschedule('evaluate-promotion-cycles') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-promotion-cycles');

-- 1. process-notifications: every 2 minutes
-- Picks up push_sent=false notifications and delivers push + email
SELECT cron.schedule(
  'process-notifications',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/process-notifications',
    headers := '{"Authorization": "Bearer sb_secret_Ti470YHzM_Hxvxz8GTfSzw_SfQKW5qC", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 2. session-reminders: every hour
-- Finds sessions starting in ~24h and notifies enrolled students
SELECT cron.schedule(
  'session-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/session-reminders',
    headers := '{"Authorization": "Bearer sb_secret_Ti470YHzM_Hxvxz8GTfSzw_SfQKW5qC", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3. weekly-summary: every Monday at 08:00 UTC
-- Sends weekly digest email to all admins
SELECT cron.schedule(
  'weekly-summary',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/weekly-summary',
    headers := '{"Authorization": "Bearer sb_secret_Ti470YHzM_Hxvxz8GTfSzw_SfQKW5qC", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 4. evaluate-promotion-cycles: every hour (at :30 past, offset from session-reminders)
-- Checks active promotion cycles and flips eligible students
SELECT cron.schedule(
  'evaluate-promotion-cycles',
  '30 * * * *',
  $$SELECT evaluate_all_promotion_cycles()$$
);
