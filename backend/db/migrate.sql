-- Run this once against your existing database to apply all pending migrations.
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE snapshots DROP CONSTRAINT IF EXISTS snapshots_source_type_check;
ALTER TABLE snapshots ADD CONSTRAINT snapshots_source_type_check
  CHECK (source_type IN ('csv', 'json', 'mixed'));

-- Password reset tokens (run once)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
