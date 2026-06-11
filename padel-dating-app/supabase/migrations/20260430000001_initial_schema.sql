-- Volpair initial schema
-- 2026-04-30

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id             uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email               text,
  full_name           text,
  date_of_birth       date,
  gender              text CHECK (gender IN ('male','female','other')),
  bio                 text,
  looking_for         text CHECK (looking_for IN ('date','partner','both','exploring')),
  visible_to          text CHECK (visible_to IN ('everyone','women','men','no_preference')) DEFAULT 'everyone',
  city                text,
  location_lat        float,
  location_lon        float,
  is_premium          boolean DEFAULT false,
  premium_expires_at  timestamptz,
  profile_complete    boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  last_active_at      timestamptz
);

-- ─── platform_connections ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_connections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform            text NOT NULL CHECK (platform IN ('playtomic','matchi','on_the_court')),
  platform_user_id    text NOT NULL,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  last_synced_at      timestamptz,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- ─── clubs ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clubs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform            text,
  platform_tenant_id  text,
  name                text NOT NULL,
  city                text,
  country_code        text,
  lat                 float,
  lon                 float,
  surface_types       text[] DEFAULT '{}',
  court_count         int,
  is_partner          boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (platform, platform_tenant_id)
);

-- ─── matches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform            text NOT NULL,
  platform_match_id   text NOT NULL,
  club_id             uuid REFERENCES clubs(id),
  tenant_name         text,
  court_name          text,
  city                text,
  country_code        text,
  lat                 float,
  lon                 float,
  played_at           timestamptz NOT NULL,
  duration_minutes    int,
  match_type          text CHECK (match_type IN ('competitive','casual')) DEFAULT 'casual',
  surface_type        text CHECK (surface_type IN ('panoramic','crystal','wall','outdoor')),
  result_confirmed    boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (platform, platform_match_id)
);

-- ─── match_players ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_players (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id            uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES users(id),
  platform_user_id    text NOT NULL,
  platform_name       text,
  team_id             text CHECK (team_id IN ('0','1')),
  result              text CHECK (result IN ('won','lost','unconfirmed')) DEFAULT 'unconfirmed',
  level_value         float,
  level_confidence    float
);

-- ─── player_stats ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_stats (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform                  text NOT NULL,
  level_value               float,
  level_confidence          float,
  total_matches             int DEFAULT 0,
  wins                      int DEFAULT 0,
  losses                    int DEFAULT 0,
  win_rate                  float DEFAULT 0,
  avg_set_score_for         float,
  avg_set_score_against     float,
  play_style                text CHECK (play_style IN ('aggressive','defensive','balanced','net_dominant')),
  preferred_time_of_day     text CHECK (preferred_time_of_day IN ('morning','afternoon','evening','flexible')),
  preferred_days            text[] DEFAULT '{}',
  top_clubs                 jsonb DEFAULT '[]',
  updated_at                timestamptz DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- ─── volpair_scores ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS volpair_scores (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_score           int DEFAULT 0,
  skill_score           int DEFAULT 0,
  style_score           int DEFAULT 0,
  availability_score    int DEFAULT 0,
  location_score        int DEFAULT 0,
  chemistry_score       int DEFAULT 0,
  proximity_score       int DEFAULT 0,
  matches_together      int DEFAULT 0,
  last_played_together  timestamptz,
  calculated_at         timestamptz DEFAULT now(),
  UNIQUE (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

-- ─── connections ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type     text NOT NULL CHECK (action_type IN ('play_again','connect','volley')),
  status          text NOT NULL CHECK (status IN ('pending','accepted','declined','expired')) DEFAULT 'pending',
  matched_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  expires_at      timestamptz DEFAULT (now() + interval '72 hours')
);

-- ─── serves (messages) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS serves (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  read_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ─── indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_match_players_user ON match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_platform_user ON match_players(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_volpair_scores_user_a ON volpair_scores(user_a_id);
CREATE INDEX IF NOT EXISTS idx_volpair_scores_user_b ON volpair_scores(user_b_id);
CREATE INDEX IF NOT EXISTS idx_volpair_scores_total ON volpair_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_sender ON connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_serves_connection ON serves(connection_id);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_lat, location_lon);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE volpair_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE serves ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Users: public read, own write
CREATE POLICY "users_read_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Platform connections: own only
CREATE POLICY "platform_connections_own" ON platform_connections USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Player stats: public read
CREATE POLICY "player_stats_read_all" ON player_stats FOR SELECT USING (true);
CREATE POLICY "player_stats_own_write" ON player_stats FOR ALL USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Matches: public read
CREATE POLICY "matches_read_all" ON matches FOR SELECT USING (true);

-- Match players: public read
CREATE POLICY "match_players_read_all" ON match_players FOR SELECT USING (true);

-- Volpair scores: read if you are one of the pair
CREATE POLICY "volpair_scores_read" ON volpair_scores FOR SELECT USING (
  user_a_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR user_b_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Connections: read if sender or receiver
CREATE POLICY "connections_read" ON connections FOR SELECT USING (
  sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR receiver_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "connections_insert" ON connections FOR INSERT WITH CHECK (
  sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "connections_update" ON connections FOR UPDATE USING (
  sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR receiver_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Serves: read if in the connection
CREATE POLICY "serves_read" ON serves FOR SELECT USING (
  connection_id IN (
    SELECT id FROM connections
    WHERE sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR receiver_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
);
CREATE POLICY "serves_insert" ON serves FOR INSERT WITH CHECK (
  sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Clubs: public read
CREATE POLICY "clubs_read_all" ON clubs FOR SELECT USING (true);
