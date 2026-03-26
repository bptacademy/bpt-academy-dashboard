-- =============================================
-- Migration: Add super_admin to user_role enum
-- 2026-03-26
-- =============================================
-- MUST be committed in its own transaction before
-- any policies can reference the new enum value.
-- (Postgres restriction: new enum values are not
--  visible within the same transaction they were added)
-- =============================================

alter type user_role add value if not exists 'super_admin';
