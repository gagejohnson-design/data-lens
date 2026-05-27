# Database Schema

**Engine:** PostgreSQL 14+  
**Database name:** `datalens` (local dev)

---

## Tables

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PRIMARY KEY` | |
| `name` | `TEXT NOT NULL` | |
| `email` | `TEXT UNIQUE NOT NULL` | |
| `password_hash` | `TEXT NOT NULL` | bcrypt, cost 12 |
| `gemini_api_key` | `TEXT` | Legacy — no longer used by the app |
| `reset_token` | `TEXT` | Password reset token (SHA-256 hex) |
| `reset_token_expires` | `TIMESTAMPTZ` | Token expiry |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

---

### `snapshots`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PRIMARY KEY` | |
| `user_id` | `INTEGER REFERENCES users(id) ON DELETE CASCADE` | |
| `name` | `TEXT NOT NULL` | User-visible name |
| `description` | `TEXT` | Optional |
| `source_type` | `TEXT NOT NULL` | `csv \| json \| mixed \| postgres \| mysql \| sqlite` |
| `snapshot_data` | `JSONB NOT NULL` | Full schema — see shape below |
| `hash` | `TEXT NOT NULL` | SHA-256 of `snapshot_data` for integrity |
| `share_token` | `UUID` | Set when user generates a public link |
| `connection_string_enc` | `TEXT` | AES-256-CBC encrypted connection string (hex) |
| `connection_iv` | `TEXT` | IV used for encryption (hex) |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Unique constraint:** `(user_id, name)`

**`snapshot_data` shape**

```jsonc
{
  "tables": [
    {
      "name": "orders",
      "row_count": 1500,
      "duplicate_count": 3,
      "columns": [
        {
          "name": "id",
          "type": "integer",
          "nullable": false,
          "null_percent": 0
        }
      ],
      "sample_rows": [ { "id": 1, ... } ],  // up to 10 rows, file-based only
      "notes": "optional user annotation"    // set via NodeSidePanel
    }
  ],
  "relationships": [
    {
      "from_table": "orders",
      "from_column": "customer_id",
      "to_table": "customers",
      "to_column": "id"
    }
  ]
}
```

---

### `audit_log`

Append-only. Rows are never updated or deleted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PRIMARY KEY` | |
| `user_id` | `INTEGER REFERENCES users(id) ON DELETE CASCADE` | |
| `snapshot_id` | `INTEGER` | Nullable (e.g. for `deleted_snapshot`) |
| `action` | `TEXT NOT NULL` | See values below |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**Action values**

| Action | When |
|--------|------|
| `connected` | Snapshot saved for the first time |
| `loaded_snapshot` | Snapshot fetched via `GET /api/snapshots/:id` |
| `exported` | Snapshot downloaded as JSON |
| `deleted_snapshot` | Snapshot deleted |
| `schema_changed` | *(v2.1)* Auto-diff detected changes on re-upload |

---

## Running migrations

All migrations are idempotent (`IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS`). Run against any existing database:

```bash
psql "$DATABASE_URL" -f backend/db/migrate.sql
```

For a fresh install, the full schema is in `backend/db/seed.js` (run once):

```bash
cd backend && node db/seed.js
```

---

## Connection string encryption

Live DB connection strings are encrypted with **AES-256-CBC** before being stored.

- Key: `ENCRYPTION_KEY` env var — must be exactly **64 hex characters** (32 bytes).
- A fresh key can be generated with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- The IV is randomly generated per connection and stored alongside the ciphertext.
- **If you rotate `ENCRYPTION_KEY`, all existing live DB snapshots will fail to decrypt.** Delete and re-connect them.
