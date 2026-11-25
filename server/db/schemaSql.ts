// Inlined copy of schema.sql so serverless bundles (Vercel) never miss the file.
// Keep in sync with server/db/schema.sql.
export const SCHEMA_SQL = String.raw`
-- ============================================================================
-- BRUTE LEGENDS — Production PostgreSQL Schema (Neon PostgreSQL compatible)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  is_guest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fighters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INT NOT NULL DEFAULT 1,
  rating INT NOT NULL DEFAULT 1000,
  power_score INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  profile_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  uid TEXT PRIMARY KEY,
  fighter_id TEXT NOT NULL REFERENCES fighters(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  rarity TEXT NOT NULL,
  upgrade_level INT NOT NULL DEFAULT 0,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  item_json JSONB NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_history (
  id TEXT PRIMARY KEY,
  left_fighter_id TEXT NOT NULL,
  right_fighter_id TEXT NOT NULL,
  winner TEXT NOT NULL,
  arena TEXT NOT NULL,
  seed BIGINT NOT NULL,
  is_pvp BOOLEAN NOT NULL DEFAULT FALSE,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups & leaderboard sorting indexes
CREATE INDEX IF NOT EXISTS idx_users_username_lower
  ON users (LOWER(username));

CREATE INDEX IF NOT EXISTS idx_users_email_lower
  ON users (LOWER(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fighters_leaderboard
  ON fighters (rating DESC, level DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_items_fighter
  ON inventory_items (fighter_id, is_equipped);

CREATE INDEX IF NOT EXISTS idx_battle_history_left
  ON battle_history (left_fighter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_battle_history_right
  ON battle_history (right_fighter_id, created_at DESC);

CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  id AS fighter_id,
  user_id,
  name,
  level,
  rating,
  power_score,
  wins,
  losses,
  updated_at
FROM fighters
ORDER BY rating DESC, level DESC, power_score DESC;
`;
