# DataLens Deployment Guide

Two services to deploy:
- **backend/** — Node.js/Express API → Render Web Service
- **frontend/** — React/Vite SPA → Netlify

---

## 1. Prerequisites

- [Render account](https://render.com) — for backend and PostgreSQL
- [Netlify account](https://netlify.com) — for frontend
- [Anthropic API key](https://console.anthropic.com) — for AI query feature
- `psql` CLI installed locally — for running schema against the remote DB

---

## 2. Database (Render PostgreSQL)

1. In the Render dashboard, click **New > PostgreSQL**
2. Name it (e.g. `datalens-db`), pick a region, click **Create Database**
3. Copy the **External Database URL** — this is your `DATABASE_URL`

```bash
# Apply schema to the new database
psql $DATABASE_URL -f backend/db/schema.sql

# Apply share token migration if upgrading an existing DB
psql $DATABASE_URL -f backend/db/migrations/001_share_token.sql

# Optional: seed with sample data (dev@datalens.test / password123)
DATABASE_URL=<your-database-url> node backend/db/seed.js
```

---

## 3. Backend (Render Web Service)

1. In Render, click **New > Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment | `Node` |

### Environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | *(connection string from step 2)* |
| `JWT_SECRET` | *(strong random string)* |
| `JWT_REFRESH_SECRET` | *(separate strong random string)* |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | *(your Netlify URL — fill in after step 4)* |
| `ANTHROPIC_API_KEY` | *(your Anthropic API key)* |

> `CORS_ORIGIN` requires your Netlify URL from step 4. Deploy the backend first, then come back and set it.

---

## 4. Frontend (Netlify)

### Option A — Netlify CLI

```bash
npm install -g netlify-cli
cd frontend
npm run build
netlify deploy --prod --dir dist
```

### Option B — Drag and drop

```bash
cd frontend && npm run build
# Drag the dist/ folder into app.netlify.com/drop
```

### Option C — Git integration

1. In the Netlify dashboard, click **Add new site > Import an existing project**
2. Connect your GitHub repo and configure:

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `dist` |

### Environment variable

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com` *(no trailing slash)* |

---

## 5. Post-Deploy Checklist

- [ ] Set `CORS_ORIGIN` in the backend Render service to your Netlify URL (e.g. `https://your-app.netlify.app`)
- [ ] Confirm `VITE_API_URL` in Netlify points to the correct backend URL
- [ ] Trigger a redeploy of the backend after updating env vars
- [ ] Smoke test: register an account, upload a CSV or JSON file, explore the schema
- [ ] Test AI queries (requires `ANTHROPIC_API_KEY` to be set)

> **Render free tier:** Web services spin down after 15 minutes of inactivity. The first request after a cold start takes 30–60 seconds. Upgrade to a paid plan to avoid this.

---

## 6. Local Development

```bash
# Backend — :3000
cd backend && npm run dev

# Frontend — :5173
cd frontend && npm run dev
```

Ensure `backend/.env` has valid values for `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ANTHROPIC_API_KEY`.
