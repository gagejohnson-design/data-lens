-- Run this once against your existing database to add the Gemini API key column.
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
