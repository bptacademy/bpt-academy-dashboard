#!/bin/bash
# setup-cron.sh — Register pg_cron schedules for BPT Academy edge functions
# Run once after deploying to a new Supabase project.
# Credentials are passed via environment / hardcoded here (not committed to migrations).

SUPABASE_URL="https://nobxhhnhakawhbimrate.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vYnhoaG5oYWthd2hiaW1yYXRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY0MDkwMiwiZXhwIjoyMDU4MjE2OTAyfQ.Wl0TIFmhkIRN99kA6s6G6GVvTbYTyY5XbMzA6RwMjCo"
DB_HOST="db.nobxhhnhakawhbimrate.supabase.co"
DB_PASSWORD="Karldavid2023!"

PSQL="/opt/homebrew/opt/libpq/bin/psql"
DB_URL="postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:5432/postgres"

AUTH_HEADER="{\"Content-Type\":\"application/json\",\"Authorization\":\"Bearer ${SERVICE_ROLE_KEY}\"}"

echo "Setting up pg_cron schedules..."

$PSQL "$DB_URL" <<SQL

-- Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Clear old jobs
DO \$\$
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
END \$\$;

-- process-notifications: every 5 minutes
SELECT cron.schedule(
  'process-notifications',
  '*/5 * * * *',
  \$cron\$
    SELECT net.http_post(
      url := '${SUPABASE_URL}/functions/v1/process-notifications',
      headers := '${AUTH_HEADER}'::jsonb,
      body := '{}'::jsonb
    );
  \$cron\$
);

-- session-reminders: daily at 07:00 UTC
SELECT cron.schedule(
  'session-reminders',
  '0 7 * * *',
  \$cron\$
    SELECT net.http_post(
      url := '${SUPABASE_URL}/functions/v1/session-reminders',
      headers := '${AUTH_HEADER}'::jsonb,
      body := '{}'::jsonb
    );
  \$cron\$
);

-- weekly-summary: every Monday at 08:00 UTC
SELECT cron.schedule(
  'weekly-summary',
  '0 8 * * 1',
  \$cron\$
    SELECT net.http_post(
      url := '${SUPABASE_URL}/functions/v1/weekly-summary',
      headers := '${AUTH_HEADER}'::jsonb,
      body := '{}'::jsonb
    );
  \$cron\$
);

-- Confirm
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;

SQL

echo "Done."
