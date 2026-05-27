# Setup Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm 9+

---

## 1. Clone and install

```bash
git clone <repo-url>
cd "Project Capstone"

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

---

## 2. Create the database

```bash
createdb datalens
cd backend && node db/seed.js
```

---

## 3. Configure environment variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://localhost/datalens
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

JWT_SECRET=<random 64-char hex>
JWT_REFRESH_SECRET=<random 64-char hex>

ANTHROPIC_API_KEY=sk-ant-...

ENCRYPTION_KEY=<random 64-char hex>
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run that three times — once each for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY`.

---

## 4. Start development servers

```bash
# Terminal 1 — backend (auto-reloads with nodemon)
cd backend && npm run dev

# Terminal 2 — frontend (Vite HMR)
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000

---

## 5. Apply migrations (existing database only)

If upgrading from a previous version, run:

```bash
psql "$DATABASE_URL" -f backend/db/migrate.sql
```

This is safe to run multiple times.

---

## Environment variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Signs access tokens (15 min expiry) |
| `JWT_REFRESH_SECRET` | Yes | Signs refresh tokens (7 day expiry) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key — AI tab won't work without it |
| `ENCRYPTION_KEY` | Yes | 64-char hex key for AES-256-CBC connection string encryption |
| `PORT` | No | API port, defaults to 3000 |
| `NODE_ENV` | No | Set to `production` to disable dev-mode reset links |
| `CORS_ORIGIN` | No | Required in production; defaults to `http://localhost:5173` in dev |

---

## Production build

```bash
cd frontend && npm run build
# Serves dist/ from any static host (Vercel, Netlify, nginx, etc.)

cd backend && NODE_ENV=production node server.js
```

In production, set `CORS_ORIGIN` to your frontend domain, and make sure all five required env vars are present — the server will exit at startup if any are missing.

---

## File upload limits

- Max file size: **10 MB** per file
- Max files per upload: **10**
- Max snapshot size stored: **5 MB** (snapshot_data JSONB)
- Max snapshots per user: **10** (oldest can be deleted to make room)

---

## Supported file formats

| Format | Extension | Notes |
|--------|-----------|-------|
| CSV | `.csv` | Parsed with PapaParse; header row required |
| JSON | `.json` | Must be an array of objects or `{ key: [...] }` |
| Excel | `.xlsx`, `.xls` | Each sheet becomes a separate table |

## Supported live databases

| Database | Connection string format |
|----------|--------------------------|
| PostgreSQL | `postgresql://user:pass@host:5432/dbname` |
| MySQL | `mysql://user:pass@host:3306/dbname` |

Schema is pulled via `information_schema`. The database user only needs `SELECT` access on `information_schema` tables.
