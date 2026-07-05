# Campus Connect

A full-stack university student portal for **Jazeera University** — courses, assignments, quizzes, real-time chat & discussions, and announcements, with role-based access for students, teachers, deans, faculty admins, and super admins.

![CI](https://github.com/sumayaabdirizak/campus-connect-dashboard/actions/workflows/ci.yml/badge.svg)

> Monorepo: a **Next.js 16** frontend and an **Express + Prisma + PostgreSQL** backend, connected over REST and **Socket.IO** for real-time features.

---

## Table of contents
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Screenshots](#screenshots)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Security highlights](#security-highlights)
- [Testing & CI](#testing--ci)
- [Roadmap](#roadmap)

---

## Features

**Role-based access (RBAC)** — Super Admin, Dean, Faculty Admin, Teacher, Student — each scoped to their faculty / department / batch / section.

- **Academic structure** — faculties → departments → programs → batches → sections → course offerings.
- **Courses** — offerings with assigned teachers and enrolled students; resources, modules, and a course feed.
- **Assignments** — draft/publish, open & due dates, file submissions, grading, submission counts.
- **Quizzes** — authoring, question bank, student attempts, auto-grading, and a **live quiz monitor** for teachers over websockets.
- **Course chat** — real-time messaging with replies, edits, @-mentions, file attachments, typing indicators, and presence.
- **Discussions** — Discord-style servers/channels and group DMs with membership, roles, presence/status, and reactions.
- **Announcements** — scoped publishing, tracked link redirects, analytics, and real-time notifications (web push via VAPID).
- **Clubs** — student clubs with membership, roles, and management.

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router, RSC), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, TanStack Form + Zod, nuqs |
| **Backend** | Node.js, Express (ES modules), Prisma ORM, Socket.IO, JWT auth, Multer |
| **Database** | PostgreSQL (89 models, migration-driven) |
| **Realtime** | Socket.IO (chat, discussions, presence, live quiz monitor) |
| **Tooling** | Vitest, oxlint/oxfmt, GitHub Actions CI, Docker (frontend) |

## Architecture

```
┌────────────────────┐         REST (JWT cookie + CSRF)         ┌─────────────────────┐
│  Next.js 16 (FE)   │  ───────────────────────────────────▶   │  Express API (BE)   │
│  App Router · RSC  │  ◀───────────────────────────────────   │  controllers/       │
│  TanStack Query    │            Socket.IO (realtime)          │  middleware (RBAC)  │
└────────────────────┘  ◀───────────────────────────────────▶  │  services/ features/│
                                                                 └──────────┬──────────┘
                                                                            │ Prisma
                                                                   ┌────────▼────────┐
                                                                   │   PostgreSQL    │
                                                                   └─────────────────┘
```

- **Auth:** JWT in httpOnly cookies + refresh-token rotation with a revocation deny-list; CSRF double-submit; account-status enforcement. The same JWT secures the Socket.IO handshake.
- **Authorization:** centralized RBAC/IDOR middleware (`courseOfferingRbac.js`) scopes every course sub-resource by membership.
- **Realtime:** Socket.IO rooms per course / discussion channel; auth + room-access gated on connect.

## Screenshots

> _Add screenshots/GIFs of the key flows here — they make the README land. Suggested: sign-in, dashboard, a course (assignments/quizzes), attendance QR, discussions, announcements._

```
docs/screenshots/  ← drop images here and reference them, e.g. ![Dashboard](docs/screenshots/dashboard.png)
```

## Getting started

### Prerequisites
- **Node.js 22+**
- **PostgreSQL 16+** (running locally or a connection string)

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env          # then fill in DATABASE_URL + JWT_SECRET
npm run prisma:migrate         # apply migrations (dev)
npm run prisma:seed            # seed roles + demo academic data (set SEED_MINIMAL=1 for a small dataset)
npm run dev                    # http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local     # set NEXT_PUBLIC_API_URL (defaults to http://localhost:4000)
npm run dev                    # http://localhost:3000
```

Open **http://localhost:3000** and sign in with the seeded super-admin credentials (see `SUPER_ADMIN_EMAIL` in your backend `.env`). New users are provisioned by administrators — there is no public self sign-up.

For Phase 2 thesis demos, see [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md) (seed accounts and a 15-minute walkthrough).

## Environment variables

**Backend** (`backend/.env`) — see [`backend/.env.example`](backend/.env.example):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Signs auth + refresh tokens (also socket auth) |
| `PORT` | — | API port (default 4000) |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_NAME` | — | Seeded super-admin account |
| `GROQ_API_KEY` / `AI_PROVIDER` | — | AI quiz-question generation |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | — | Web-push notifications |

**Frontend** (`frontend/.env.local`) — see [`frontend/.env.example`](frontend/.env.example):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL for REST + Socket.IO (default `http://localhost:4000`) |

> `.env` files are git-ignored. Never commit real secrets.

## Project structure

```
campus-connect/
├── backend/
│   ├── prisma/            # schema.prisma + migrations
│   └── src/
│       ├── controllers/   # route handlers (academic, courseDetails, dean, discussions, ...)
│       ├── middleware/     # auth, csrf, rbac, rate limits, error handler
│       ├── features/       # announcements, discussions, clubs (services)
│       ├── socket/         # Socket.IO handlers (chat, quiz monitor, ...)
│       └── server.js       # HTTP + Socket.IO entrypoint
└── frontend/
    └── src/
        ├── app/            # Next.js App Router routes
        ├── features/       # per-feature modules (api/ + components/)
        ├── components/     # shared UI (ui/ = shadcn primitives)
        └── styles/         # Tailwind v4 + theme tokens
```

## Security highlights
- JWT (httpOnly cookies) with **refresh-token rotation + revocation deny-list**, enforced on both HTTP and Socket.IO.
- **Account-status enforcement** — disabled users are locked out immediately, not at token expiry.
- **CSRF** double-submit; **Helmet** headers; env-driven **CORS allowlist** (no wildcards with credentials).
- **Upload safety** — extension allowlist + magic-byte content sniffing + `Content-Disposition: attachment`.
- **RBAC/IDOR** middleware scoping every course sub-resource by membership; parameterized SQL throughout; SSRF guard on outbound URLs.
- Per-IP **and** per-account login rate limiting.

## Testing & CI
- **Unit tests** (Vitest, no DB needed): `cd backend && npm run test:unit`.
- **Full suite** (needs Postgres): `cd backend && npm test`.
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) on every push/PR:
  - Frontend: `npm ci` → `lint` → `typecheck`.
  - Backend: spin up Postgres → Prisma generate/validate/migrate/seed → `npm test` → `/health` smoke test.

## Roadmap
- Dark-mode token migration across remaining feature components.
- Backend Dockerfile + `docker-compose` for one-command local/prod bring-up.
- Broaden unit-test coverage of business logic.

---

Built by [@sumayaabdirizak](https://github.com/sumayaabdirizak).
