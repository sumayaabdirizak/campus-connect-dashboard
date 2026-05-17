# Local bootstrap

This repo keeps **environment files next to each app**, not a single `.env` at the monorepo root. Use the **root `.env.example`** only as a template: copy the backend block into `backend/.env` and the frontend block into `frontend/.env.local`.

1. **PostgreSQL** — Create a database (for example `campus_connect`) and note the connection string.

2. **Backend** — From the repo root:
   - Copy variables from `.env.example` into `backend/.env` (required: `DATABASE_URL`, `JWT_SECRET`; optional: `PORT`).
   - `cd backend && npm ci && npm run prisma:generate && npm run prisma:migrate`
   - First-time or CI-like apply: `npm run prisma:migrate:deploy` then `npm run prisma:db:status` (alias: `npm run db:status`) — expect **no pending migrations**.
   - Optional demo data: `npm run prisma:seed` — or full reset + seed: `npm run db:reset-seed` (**drops the database**).

3. **Frontend** — `cd frontend && npm ci` — copy `NEXT_PUBLIC_API_URL` from `.env.example` into `frontend/.env.local` if you need a non-default API host.

4. **Run** — Terminal A: `cd backend && npm run dev` — Terminal B: `cd frontend && npm run dev`

## Database scripts (backend)

| Script | Purpose |
|--------|---------|
| `npm run prisma:migrate` | Create/apply migrations in development (`migrate dev`). |
| `npm run prisma:migrate:deploy` | Apply pending migrations (`migrate deploy`), for CI/staging/prod. |
| `npm run db:status` / `npm run prisma:db:status` | Show migration history vs database (`prisma migrate status`). |
| `npm run db:reset-seed` | **Destructive:** drops the database, reapplies all migrations, runs the seed. |

## Health check

With the backend running (`npm run start` or `npm run dev`), `GET /health` returns JSON `{ "ok": true, "db": true }` when the database responds, or HTTP 503 with `{ "ok": false, "db": false }` when the DB check fails. The handler uses the shared client from `src/db/prisma.js`.

## Sprint 0 verification (from `backend/`)

Use `npm run …` (not `npx prisma:validate` — that is not valid npx syntax). Equivalent sequence:

```bash
cd backend
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:db:status
```

Then start the API and check readiness:

```bash
npm run start
# elsewhere: curl http://localhost:4000/health
```
