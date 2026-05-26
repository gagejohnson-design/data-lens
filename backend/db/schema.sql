-- DataLens Database Schema

CREATE TABLE IF NOT EXISTS users (
  id                     SERIAL PRIMARY KEY,
  name                   VARCHAR(255) NOT NULL,
  email                  VARCHAR(255) UNIQUE NOT NULL,
  password_hash          TEXT NOT NULL,
  failed_login_attempts  INTEGER DEFAULT 0,
  locked_until           TIMESTAMP,
  gemini_api_key         TEXT,
  reset_token            TEXT,
  reset_token_expires    TIMESTAMPTZ,
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  source_type    VARCHAR(50) NOT NULL CHECK (source_type IN ('csv', 'json', 'mixed')),
  snapshot_data  JSONB NOT NULL,
  hash           TEXT NOT NULL,
  share_token    UUID UNIQUE,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_id  INTEGER REFERENCES snapshots(id) ON DELETE SET NULL,
  action       VARCHAR(50) NOT NULL CHECK (action IN ('connected', 'loaded_snapshot', 'deleted_snapshot', 'exported')),
  created_at   TIMESTAMP DEFAULT NOW()
);
