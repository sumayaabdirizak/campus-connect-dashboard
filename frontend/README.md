# Campus Connect — Frontend

Next.js 16 app for the Campus Connect LMS (courses, announcements, discussions, dean tools).

Part of the monorepo — full setup is in the [root README](../README.md).

## Quick start

```bash
# from repo root (or here after backend is up)
cd frontend
cp .env.example .env.local   # if present; else set NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3000
```

Backend API should be at `http://localhost:4000` (`NEXT_PUBLIC_API_URL=http://localhost:4000/api`).

## Auth

Cookie JWT + CSRF via the Express API — not Clerk, not `localStorage` tokens. See [docs/auth.md](./docs/auth.md).

## Stack

- Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui
- TanStack Query · Zustand · Zod
- Socket.IO client (discussions / presence)
- Optional Sentry (`NEXT_PUBLIC_SENTRY_DSN`)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint (oxlint) |

## Docs

- [Auth](./docs/auth.md) · [Nav RBAC](./docs/nav-rbac.md)
- Repo: [DEMO_GUIDE](../docs/DEMO_GUIDE.md) · [SYSTEM_DESIGN](../docs/SYSTEM_DESIGN.md) · [SECURITY](../docs/SECURITY.md)
