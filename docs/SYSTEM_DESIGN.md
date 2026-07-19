# System design — Campus Connect

High-level architecture of the campus LMS monorepo.

## Components

| Piece | Stack | Role |
|-------|--------|------|
| Frontend | Next.js 16 App Router, React 19, Tailwind v4, shadcn | Dashboards, course UI, discussions, announcements |
| Backend | Express 5 (ESM), Prisma 6, Socket.IO | REST API, auth, RBAC, realtime |
| Database | PostgreSQL 16 | Academic + LMS + discussions models |
| Optional | Redis / BullMQ | Socket adapter, announcement jobs |

```
Browser ──► Next.js (:3000)
              │ credentials: include
              ▼
            Express (/api) + Socket.IO (:4000)
              │ Prisma
              ▼
            PostgreSQL
```

## Auth model

- Access + refresh JWTs in **httpOnly** cookies (`auth_token`, `refresh_token`).
- Access payload includes `tokenType: "access"`, `jti`, and `tv` (user `tokenVersion`).
- Logout revokes jtis; disabling a user calls `revokeAllForUser` (bumps `tokenVersion`).
- HTTP + Socket.IO both enforce jti deny-list, token type, ACTIVE status, and `tv`.
- CSRF double-submit on mutating `/api` routes (login/refresh/logout exempt from JWT gate; CSRF still required on logout).

## Authorization

- Global `/api` auth gate (public: login, refresh, csrf, logout).
- Course offering RBAC (`courseOfferingRbac.js`) for LMS sub-resources.
- Nav pages: DB registry (`NavPage` + `RoleNavPermission`) synced from `navPages.registry.js`; UI reads `GET /api/rbac/me/nav-pages` with client role fallback.
- Dean / Super Admin routes via `requireRole` / `requireDean`.

## List API contract

Prefer `namedListSuccess` / `paginatedPayload`: `{ status: "success", message, <domainKey>, results, totalCount, page, pageSize }`. Query: `page`, `pageSize`|`limit` (defaults usually 50, max 200). Legacy domain keys (`faculties`, `courses`, `threads`, …) are kept for existing clients.

## Domains (backend)

| Area | Location |
|------|----------|
| Auth / users | `controllers/auth` |
| Academic CRUD | `controllers/academic` |
| Dean admin | `controllers/dean` |
| Course LMS | `controllers/courses` |
| Announcements | `features/announcements` |
| Discussions | `features/discussions` + `controllers/discussions` |
| Offices / inbox | `controllers/offices`, `controllers/inbox` |
| Socket handlers | `socket/handlers` |

## Frontend domains

Feature folders under `frontend/src/features/*` (api + components). Thin pages in `app/dashboard/*`.

## Uploads

Uploads: `STORAGE_DRIVER=local` (default) or `s3` — see [UPLOAD_STORAGE.md](./UPLOAD_STORAGE.md). All major prefixes (resources, discussions, assignments, submissions, chat, course-feed, announcements, covers) go through `objectStorage.js`. `/uploads` falls through to signed S3 serving when enabled.

## Related docs

- [DEMO_GUIDE.md](./DEMO_GUIDE.md)
- [SECURITY.md](./SECURITY.md)
- Frontend: `frontend/docs/auth.md`, `nav-rbac.md`
