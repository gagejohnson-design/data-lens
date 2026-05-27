-- Run this once against your existing database to apply all pending migrations.
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE snapshots DROP CONSTRAINT IF EXISTS snapshots_source_type_check;
ALTER TABLE snapshots ADD CONSTRAINT snapshots_source_type_check
  CHECK (source_type IN ('csv', 'json', 'mixed'));

-- Password reset tokens (run once)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

-- v2.0: Live DB connections
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS connection_string_enc TEXT;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS connection_iv TEXT;
ALTER TABLE snapshots DROP CONSTRAINT IF EXISTS snapshots_source_type_check;
ALTER TABLE snapshots ADD CONSTRAINT snapshots_source_type_check
  CHECK (source_type IN ('csv', 'json', 'mixed', 'postgres', 'mysql', 'sqlite'));

-- v2.1: Saved AI queries (persisted query history)
CREATE TABLE IF NOT EXISTS saved_queries (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  sql          TEXT NOT NULL,
  snapshot_ids INTEGER[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS saved_queries_user_idx ON saved_queries(user_id);
