# Architecture

## Overview

DataLens is a fullstack web application for schema exploration and SQL generation. It consists of three layers: a React SPA frontend, an Express REST API backend, and a PostgreSQL database. All three run independently and communicate over HTTP.

```
Browser (React + Vite)
       │
       │  HTTP / JWT (cookies)
       ▼
Express API  (Node 20+, port 3000)
       │
       ├── PostgreSQL  (app data: users, snapshots, audit)
       └── External DBs  (postgres:// / mysql:// — live connections)
```

---

## Frontend

**Stack:** React 18, Vite, React Router v6, Axios, ReactFlow + dagre

**Entry:** `frontend/src/main.jsx` → `App.jsx`

### Page routes

| Path | Component | Auth |
|------|-----------|------|
| `/` | `LandingPage` | Public (redirects → `/hub` if logged in) |
| `/hub` | `ConnectionHubPage` | Protected |
| `/explorer` | `ExplorerPage` | Protected |
| `/settings` | `AccountSettingsPage` | Protected |
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |
| `/forgot-password` | `ForgotPasswordPage` | Public |
| `/reset-password` | `ResetPasswordPage` | Public |
| `/shared/:token` | `SharedSnapshotPage` | Public |

### State management

Global state lives in two React contexts under `frontend/src/context/`:

- **`AuthContext`** — current user, JWT access token (in memory), refresh token (httpOnly cookie). Axios interceptors in `api-client.js` auto-refresh on 401.
- **`SnapshotContext`** — active explorer session: `sessionSnapshots[]`, `mergedSnapshot`, `primarySnapshotId`. The merged snapshot combines all session sources into one unified table list for cross-source queries.
- **`ToastContext`** — global toast notifications.

### Explorer tabs

`ExplorerPage` renders one of seven tabs keyed `1`–`7`:

| Key | Tab | Component |
|-----|-----|-----------|
| 1 | Schema Browser | `SchemaBrowser` |
| 2 | Relationship Map | `RelationshipMap` (ReactFlow + dagre, lazy loaded) |
| 3 | Data Health | `DataHealth` |
| 4 | Ask AI | `AiQuery` |
| 5 | Compare Snapshots | `SnapshotDiff` |
| 6 | Audit Log | `AuditLog` |
| 7 | SQL Query Runner | `SqlQueryRunner` |

### Code splitting

All heavy pages are lazy-loaded via `React.lazy`. ReactFlow and dagre are bundled in a separate `vendor-flow` chunk.

---

## Backend

**Stack:** Node 20+, Express 4, pg (node-postgres), mysql2, @anthropic-ai/sdk, bcrypt, jsonwebtoken, multer, helmet, express-rate-limit

**Entry:** `backend/server.js` → loads dotenv → `src/app.js`

### Router map

| Prefix | File | Responsibility |
|--------|------|----------------|
| `/api/auth` | `routers/auth.js` | Register, login, token refresh, forgot/reset password |
| `/api/users` | `routers/users.js` | Profile update, password change, account delete |
| `/api/snapshots` | `routers/snapshots.js` | CRUD, export, diff, share token |
| `/api/connect` | `routers/connect.js` | File upload parsing, live DB connection |
| `/api/query` | `routers/query.js` | Proxy SQL to live DB |
| `/api/ai` | `routers/ai.js` | Claude SQL generation |
| `/api/audit` | `routers/audit.js` | Audit log read |
| `/api/share` | `routers/share.js` | Public snapshot read via share token |

### Middleware stack (per request)

1. `helmet` — security headers
2. `cors` — controlled by `CORS_ORIGIN` env var
3. `express.json` — 2 MB body limit
4. `cookieParser`
5. Route-level: `requireAuth` (JWT verification) → rate limiter → handler

### Authentication flow

1. Login → server issues short-lived **access token** (15 min, in response body) + long-lived **refresh token** (7 days, httpOnly cookie).
2. Frontend stores access token in memory (`AuthContext`). Axios interceptor attaches it as `Authorization: Bearer`.
3. On 401, interceptor calls `POST /api/auth/refresh` using the cookie, gets a new access token, retries the original request.
4. Logout clears the cookie server-side.

### File parsing

`backend/src/adapters/csv.js` handles CSV (via PapaParse) and Excel (via xlsx). JSON is parsed inline in `connect.js`. All parsing is synchronous and runs in the request handler — files are processed in memory (multer `memoryStorage`), never written to disk.

### Live DB connections

`POST /api/connect/db` pulls schema via `information_schema` queries, then **AES-256-CBC encrypts** the connection string before returning `{ enc, iv }` to the client. The client passes these back when saving the snapshot; the backend stores them in `connection_string_enc` / `connection_iv` columns. The plaintext connection string is never persisted.

`POST /api/query/run` decrypts the stored connection string on the fly and proxies the SQL query to the target database.

---

## Database

See [`database.md`](database.md) for full schema documentation.

**Engine:** PostgreSQL 14+

**Three tables:**
- `users` — accounts and credentials
- `snapshots` — schema data (JSONB), optional encrypted live connection
- `audit_log` — immutable activity history

---

## Security notes

- Passwords: bcrypt, cost factor 12
- JWTs: separate secrets for access and refresh tokens, stored in env vars
- Connection strings: AES-256-CBC, key from `ENCRYPTION_KEY` env var (32-byte hex). Never logged, never returned in API responses after initial storage.
- Rate limiting: auth endpoints (20 req/15 min), uploads (10 req/min), AI queries (20 req/min)
- Snapshot size cap: 5 MB per snapshot, 10 snapshots per user
- CORS: explicit `CORS_ORIGIN` required in production
