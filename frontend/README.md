# DataLens

A web app that gives business users a visual map of their data — schema browser, relationship graph, data health dashboard, and AI-powered SQL generation — without writing a single query.

Upload a CSV, JSON, or Excel file and instantly explore your schema, column health, and table relationships.

## Features

- **File Upload** — drag-and-drop CSV, JSON, or Excel (.xlsx/.xls); each sheet becomes its own table
- **Schema Browser** — every table and column with type, nullable status, null rate bars, and inline sample rows with distribution toggle
- **Relationship Map** — interactive React Flow graph; click any node for schema, health, and editable notes
- **Data Health** — traffic-light dashboard (Good / Warning / Poor) with row counts, null rates, and duplicate counts per table
- **Ask AI** — type a question in plain English, get back a SQL query generated from your schema
- **Compare Snapshots** — diff two snapshots to see added/removed tables, column changes, and row count shifts
- **Snapshot System** — files parsed in memory and saved as hashed JSON snapshots (max 10 per user)
- **Share Links** — generate a public read-only link for any snapshot
- **Audit Log** — every upload, load, export, and deletion recorded server-side

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Graph | React Flow |
| HTTP client | Axios (JWT attach + auto-refresh on 401) |
| Backend | Node.js + Express |
| Database | PostgreSQL (via `pg`) — stores user accounts and snapshots |
| Auth | bcrypt + JWT (15m access / 7d httpOnly refresh cookie) |
| File parsing | multer + papaparse + xlsx |
| AI queries | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Security | helmet, cors, express-rate-limit |

## Project Structure

```
/
├── backend/
│   ├── db/
│   │   ├── schema.sql
│   │   ├── seed.js             creates dev@datalens.test / password123
│   │   └── migrations/
│   ├── src/
│   │   ├── adapters/
│   │   │   └── csv.js          CSV and Excel parsing
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   └── routers/
│   │       ├── auth.js
│   │       ├── users.js
│   │       ├── snapshots.js
│   │       ├── connect.js      file upload + snapshot import
│   │       ├── share.js        public share links
│   │       ├── ai.js           natural language → SQL
│   │       └── audit.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/
        │   ├── api-client.js
        │   ├── auth.js
        │   ├── users.js
        │   ├── snapshots.js
        │   ├── connections.js
        │   ├── ai.js
        │   └── audit.js
        ├── context/
        │   ├── AuthContext.jsx
        │   └── SnapshotContext.jsx
        ├── components/
        │   ├── common/         NavBar, InfoModal, ProtectedRoute
        │   ├── connection/     FileUploadForm, SnapshotManager
        │   └── explorer/       SchemaBrowser, RelationshipMap, DataHealth,
        │                       NodeSidePanel, AuditLog, AiQuery, SnapshotDiff
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── ConnectionHubPage.jsx
            ├── ExplorerPage.jsx
            ├── SharedSnapshotPage.jsx
            └── AccountSettingsPage.jsx
```

## Database Schema

### users
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | varchar(255) | |
| email | varchar(255) | unique |
| password_hash | text | bcrypt, 12 rounds |
| failed_login_attempts | integer | lockout after 5 |
| locked_until | timestamp | 15-minute lockout window |

### snapshots
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| user_id | FK → users | ON DELETE CASCADE |
| name | varchar(255) | unique per user |
| source_type | varchar | `csv` \| `json` |
| snapshot_data | jsonb | tables + relationships + health |
| hash | text | SHA-256 of snapshot_data |
| share_token | uuid | nullable — set when shared |

### audit_log
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| user_id | FK → users | ON DELETE CASCADE |
| snapshot_id | FK → snapshots | ON DELETE SET NULL |
| action | varchar | `connected` \| `loaded_snapshot` \| `deleted_snapshot` \| `exported` |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Authenticate |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Clear refresh cookie |
| GET | /api/users/me | Get profile |
| PUT | /api/users/me | Update name / email |
| PUT | /api/users/me/password | Update password |
| DELETE | /api/users/me | Delete account |
| GET | /api/snapshots | List snapshots |
| GET | /api/snapshots/:id | Get snapshot |
| GET | /api/snapshots/:id/export | Download as JSON |
| GET | /api/snapshots/:id/diff/:otherId | Diff two snapshots |
| POST | /api/snapshots | Save snapshot |
| PUT | /api/snapshots/:id | Rename |
| PATCH | /api/snapshots/:id/data | Update snapshot data (notes) |
| DELETE | /api/snapshots/:id | Delete |
| POST | /api/snapshots/:id/share | Generate share link |
| DELETE | /api/snapshots/:id/share | Revoke share link |
| GET | /api/share/:token | Public snapshot by share token |
| POST | /api/connect/upload | Upload CSV / JSON / Excel |
| POST | /api/connect/snapshot | Import exported snapshot JSON |
| POST | /api/ai/query | Natural language → SQL |
| GET | /api/audit | Activity history |

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### Backend

```bash
cd backend
npm install
# .env is pre-configured for local dev
# Add your ANTHROPIC_API_KEY to .env to enable AI queries
psql -c "CREATE DATABASE datalens"
psql datalens -f db/schema.sql
npm run db:seed        # creates dev@datalens.test / password123
npm run dev            # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Log in with `dev@datalens.test` / `password123`, then upload any CSV or JSON file.

## Security

- Passwords hashed with bcrypt (12 salt rounds)
- JWT access tokens expire in 15 minutes; refresh tokens stored in httpOnly cookies
- 5 failed login attempts locks the account for 15 minutes
- Files parsed in memory via multer — never written to disk; 10 MB limit enforced
- Upload endpoint rate-limited to 10 requests/min per IP
- Snapshots hashed with SHA-256 on save and verified on import
- All routes derive `user_id` from JWT payload, never from the request body
