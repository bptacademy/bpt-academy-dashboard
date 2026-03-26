-- =============================================
-- Migration: Enable Realtime on messaging tables
-- 2026-03-26
-- =============================================
-- The supabase_realtime publication had no tables,
-- which is why chat messages never arrived via
-- WebSocket. Add messages + notifications tables
-- so real-time subscriptions work.
-- =============================================

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table conversation_members;
