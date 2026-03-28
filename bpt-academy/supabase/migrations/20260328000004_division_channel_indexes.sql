-- =============================================================================
-- Migration: 20260328000004_division_channel_indexes
-- Purpose:   Performance indexes for division channel queries
-- =============================================================================

-- Speed up lookups like: WHERE division = 'amateur' AND conversation_type = 'division_group'
create index if not exists idx_conversations_division
  on conversations(division);

-- Speed up filtering conversations by type (direct / program_group / division_group)
create index if not exists idx_conversations_type
  on conversations(conversation_type);

-- Speed up archive queries by profile (e.g. "show my membership history")
create index if not exists idx_conv_member_archive_profile
  on conversation_member_archive(profile_id);
