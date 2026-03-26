-- =============================================
-- Migration: Schedule promotion eval via pg_cron
-- 2026-03-26 — Run after pg_cron is enabled
-- =============================================

select cron.schedule(
  'evaluate-promotion-cycles',
  '0 * * * *',
  $$select evaluate_all_promotion_cycles()$$
);
