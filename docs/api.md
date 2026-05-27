# API Reference

Base URL: `http://localhost:3000` (development)

All protected endpoints require `Authorization: Bearer <access_token>`. The access token is obtained from `POST /api/auth/login` and refreshed via `POST /api/auth/refresh`.

---

## Auth

### `POST /api/auth/register`
Create a new account.

**Body**
```json
{ "name": "Jane", "email": "jane@example.com", "password": "secret123" }
```

**Response `201`**
```json
{ "accessToken": "...", "user": { "id": 1, "name": "Jane", "email": "..." } }
```

---

### `POST /api/auth/login`
**Body**
```json
{ "email": "jane@example.com", "password": "secret123" }
```

**Response `200`** — Sets `refreshToken` httpOnly cookie.
```json
{ "accessToken": "...", "user": { "id": 1, "name": "Jane", "email": "..." } }
```

---

### `POST /api/auth/refresh`
Uses the `refreshToken` cookie to issue a new access token.

**Response `200`**
```json
{ "accessToken": "..." }
```

---

### `POST /api/auth/logout`
Clears the `refreshToken` cookie.

---

### `POST /api/auth/forgot-password`
**Body** `{ "email": "jane@example.com" }`

In development, the response body includes `resetLink`. In production, send this link by email.

---

### `POST /api/auth/reset-password`
**Body** `{ "token": "...", "password": "newpassword" }`

---

## Users

All endpoints require auth.

### `GET /api/users/me`
Returns `{ id, name, email, created_at }`.

### `PUT /api/users/me`
**Body** `{ "name": "...", "email": "..." }` (both optional)

### `PUT /api/users/me/password`
**Body** `{ "currentPassword": "...", "newPassword": "..." }`

### `DELETE /api/users/me`
Deletes account and all snapshots. Clears refresh cookie.

---

## Snapshots

All endpoints require auth.

### `GET /api/snapshots`
Returns array of snapshot metadata (no `snapshot_data`).

```json
[{ "id": 1, "name": "sales_q1", "source_type": "csv", "created_at": "..." }]
```

### `GET /api/snapshots/:id`
Returns full snapshot including `snapshot_data`. Logs a `loaded_snapshot` audit event.

### `POST /api/snapshots`
Save a new snapshot. Max 10 per user; returns `409` with `oldest` if limit reached.

**Body**
```json
{
  "name": "My DB",
  "description": "optional",
  "source_type": "postgres",
  "snapshot_data": { "tables": [...], "relationships": [...] },
  "connection_string_enc": "abc...",
  "connection_iv": "def..."
}
```
`connection_string_enc` and `connection_iv` are only required for live DB snapshots; omit for file-based.

### `PUT /api/snapshots/:id`
Rename / update description. **Body** `{ "name": "...", "description": "..." }`

### `PATCH /api/snapshots/:id/data`
Persist updated `snapshot_data` (e.g. table notes, relationship edits). **Body** `{ "snapshot_data": {...} }`

### `DELETE /api/snapshots/:id`

### `GET /api/snapshots/:id/export`
Returns snapshot as a downloadable JSON file with an integrity hash (`_hash`).

### `GET /api/snapshots/:id/diff/:otherId`
Compare two snapshots. Returns per-table diff with `added | removed | changed | unchanged` status, row count deltas, and column changes.

### `POST /api/snapshots/:id/share`
Generate (or return existing) public share token.

**Response** `{ "share_token": "uuid" }`

### `DELETE /api/snapshots/:id/share`
Revoke the share token.

---

## Connect

All endpoints require auth.

### `POST /api/connect/upload`
Upload one or more files (CSV, JSON, XLSX, XLS). Multipart form-data, field name `files`.

**Response**
```json
{
  "tables": [{ "name": "orders", "row_count": 1500, "columns": [...], "sample_rows": [...] }],
  "relationships": [],
  "source_type": "csv"
}
```

### `POST /api/connect/db`
Connect to a live PostgreSQL or MySQL database.

**Body**
```json
{ "connectionString": "postgresql://user:pass@host:5432/dbname" }
```

**Response `200`**
```json
{
  "tables": [...],
  "relationships": [],
  "source_type": "postgres",
  "connection": { "enc": "abc...", "iv": "def...", "name": "host:5432/dbname" }
}
```
Pass `connection.enc` and `connection.iv` as `connection_string_enc` / `connection_iv` to `POST /api/snapshots` to persist the encrypted connection.

**Errors**
- `400` — unreachable host, auth failure, no tables found, unsupported DB type

### `POST /api/connect/snapshot`
Import a previously exported snapshot JSON (validates the `_hash` integrity field).

---

## Query

Requires auth.

### `POST /api/query/run`
Run a SQL query against a live DB snapshot.

**Body**
```json
{ "sql": "SELECT * FROM orders LIMIT 10", "snapshotId": 3 }
```

**Response `200`**
```json
{
  "fields": ["id", "customer", "amount"],
  "rows": [{ "id": 1, "customer": "Acme", "amount": 99.99 }],
  "rowCount": 1
}
```

**Errors**
- `400 fileBased: true` — snapshot has no live connection; use file-based tooling instead
- `400` — SQL syntax error
- `403` — DB user lacks SELECT permission
- `404` — snapshot not found

---

## AI

Requires auth. Rate limited to 20 requests/minute.

### `POST /api/ai/query`
Generate SQL from a plain-English question using Claude.

**Body**
```json
{
  "question": "Show me the top 5 customers by revenue",
  "snapshotIds": [1, 2]
}
```
Use `snapshotId` (singular) for a single snapshot, or `snapshotIds` (array) for a multi-source session.

**Response `200`**
```json
{ "sql": "SELECT customer_id, SUM(amount) ...", "question": "Show me..." }
```

**Errors**
- `400` — question missing or > 500 chars, no snapshot IDs
- `429 quotaExceeded: true` — Claude rate limit hit
- `500` — `ANTHROPIC_API_KEY` not configured

---

## Audit

Requires auth.

### `GET /api/audit`
Returns last 100 audit events for the current user.

```json
[{ "id": 1, "action": "connected", "snapshot_id": 3, "created_at": "..." }]
```

**Action values:** `connected`, `loaded_snapshot`, `exported`, `deleted_snapshot`, `schema_changed`

---

## Share (public)

No auth required.

### `GET /api/share/:token`
Returns snapshot data for a public share link (read-only, no connection string data).
