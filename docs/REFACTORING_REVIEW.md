# Campus Connect — Code Review & Refactoring Report

**Date:** June 2026  
**Scope:** Full-stack review (Next.js frontend + Express/Prisma backend)  
**Approach:** Incremental refactors — no full rewrite; existing features preserved.

---

## 1. Problems Found

### Frontend

| Area | Issue |
|------|--------|
| **API config** | `NEXT_PUBLIC_API_URL` duplicated in 12+ files with slightly different fallbacks |
| **Socket URLs** | Three separate `getSocketUrl` implementations (discussions, announcements, course chat) |
| **Uploads** | Multipart + CSRF fetch logic copy-pasted across 6+ services |
| **Debug code** | Agent instrumentation `fetch('http://127.0.0.1:7768/ingest/...')` in admin analytics |
| **Error UI** | No shared query error component — each page hand-rolls error markup |
| **Large files** | `course-quizzes.tsx` (~2,900 lines) mixes student/teacher/builder/monitor/offline queue |
| **Empty states** | Two parallel `EmptyState` components (`components/ui` vs `course-details/_shared`) |
| **Legacy template** | Mock routes and overview parallel slots removed; Clerk docs replaced with `frontend/docs/auth.md` |
| **Env docs** | `.env.example` missing `/api` suffix — mismatch with code defaults |

### Backend

| Area | Issue |
|------|--------|
| **Response format** | Three+ error shapes: `{ status, message, details }`, `{ message }`, `{ error, code }` |
| **Success format** | No shared success envelope — raw Prisma entities vs paginated vs auth tokens |
| **Validation** | Joi (middleware) + inline Zod in routes — Zod errors sometimes bypass global handler |
| **Auth layering** | Global `/api` JWT gate + per-route `auth` → double verification on many endpoints |
| **Monolithic files** | `server.js` (~1,692), `discussions.js` (~2,349), `routes.announcements.js` (~1,578) |
| **Password hashing** | Both `bcrypt` and `bcryptjs` in different modules |
| **Env config** | Only 3 vars in `config/env.js`; 50+ direct `process.env` reads elsewhere |
| **Tests** | `vitest.config.js` references missing `tests/` directory |

### Security (already good, gaps noted)

- HttpOnly cookies + CSRF on mutating routes
- Helmet, CORS, rate limits on login/refresh
- JWT revocation via jti
- **Gap:** Inconsistent validation paths; some routes return raw error messages

---

## 2. What Was Improved (This Pass)

### Applied changes

| Change | Files |
|--------|-------|
| Removed debug agent log fetches | `frontend/src/features/admin/api/admin-api.ts`, `queries.ts` |
| Centralized API URL config | `frontend/src/lib/api-config.ts` (new) |
| Centralized upload helper | `frontend/src/lib/upload-client.ts` (new) |
| Wired shared config | `api-client.ts`, `auth-store.ts`, `resolve-public-asset-url.ts`, socket modules |
| Shared query error UI | `frontend/src/components/query-error-state.tsx` (new) |
| Expanded backend env | `backend/src/config/env.js` — CORS, Redis, JWT expiry, `parseCorsOrigins()` |
| Success response helpers | `backend/src/utils/apiEnvelope.js` — `apiSuccessBody`, `sendSuccess`, `sendError` |
| Fixed env example | `frontend/.env.example` — documents `/api` suffix |

### Socket modules now use one source

- `features/discussions/api/socket.ts`
- `features/announcements/api/use-announcement-socket.ts`
- `features/course-details/api/use-chat-socket.ts`
- `features/course-details/api/use-quiz-live-monitor.ts`

---

## 3. Current Folder Structure (Actual)

### Backend (evolved, not identical to template)

```
backend/src/
├── config/env.js          ← expanded
├── db/prisma.js
├── middleware/            ← auth, csrf, errorHandler, RBAC, rate limits, validateRequest
├── validation/            ← Joi schemas (auth, quiz, question-bank)
├── utils/                 ← apiEnvelope, asyncHandler, httpError, pagination, …
├── services/              ← cross-cutting (quiz attempt, AI, push, audit)
├── features/              ← newer domains (announcements, discussions, clubs)
├── controllers/           ← legacy route+handler layout (academic, courses, dean, …)
├── socket/                ← hub, handlers, quiz monitor
├── app.js                 ← Express app factory
└── server.js              ← HTTP + Socket.IO + background jobs
```

### Frontend (feature-based, App Router)

```
frontend/src/
├── app/                   ← thin route shells → feature components
├── components/
│   ├── ui/                ← shadcn primitives
│   ├── layout/            ← sidebar, header, providers
│   ├── auth/              ← RoleGuard
│   └── query-error-state.tsx  ← NEW shared error UI
├── lib/
│   ├── api-client.ts      ← cookie auth + CSRF + refresh
│   ├── api-config.ts      ← NEW single API/socket URL source
│   ├── upload-client.ts   ← NEW multipart helper
│   ├── async-query.ts     ← custom query cache
│   └── auth-store.ts
├── features/<domain>/     ← api/ (types, service, queries) + components/
└── config/nav-config.ts
```

---

## 4. Files to Remove (Recommended, Not Done Yet)

| File / area | Reason |
|-------------|--------|
| `frontend/src/app/api/users/` | Mock template data — not used by real auth |
| `frontend/src/app/dashboard/overview/@*` | Template parallel-route demo |
| `backend/src/controllers/debug/` | Dev-only; keep gated behind `NODE_ENV !== production` or remove for prod builds |
| Duplicate `EmptyState` | Merge into one component with variants |

---

## 5. Files to Merge / Split (Recommended)

| Action | Target |
|--------|--------|
| **Split** | `course-quizzes.tsx` → `QuizList`, `StudentAttempt`, `QuizBuilder`, `QuizTeacherCard` |
| **Split** | `server.js` discussion handlers → `socket/handlers/discussions.js` |
| **Split** | `discussions.js`, `routes.announcements.js`, `course-offerings.js` → routes + services |
| **Merge** | `admin-api.ts` / `dean-api.ts` patterns → consistent `service.ts` per feature |
| **Merge** | `bcrypt` + `bcryptjs` → single `utils/password.js` |

---

## 6. Security Improvements

### Already in place
- Password hashing (bcrypt/bcryptjs)
- JWT in HttpOnly cookies (not localStorage)
- CSRF double-submit on mutating `/api` routes
- Helmet security headers
- CORS allowlist
- Login / refresh rate limiting
- Prisma (parameterized queries — SQL injection resistant)
- Role-based access (DEAN, TEACHER, STUDENT, SUPER_ADMIN)
- Course offering RBAC middleware

### Recommended next steps
1. Pick **one** validation library (Joi or Zod) and route all errors through `errorHandler`
2. Remove duplicate JWT verification (global gate **or** router-level, not both)
3. Consolidate password hashing to one module
4. Expand `assertEnv()` for production (CORS, Redis if required)
5. Audit file upload MIME/size limits across discussions, resources, assignments

---

## 7. Performance Improvements

### Already in place
- React feature-based code splitting via dynamic imports in places
- Custom async-query cache with staleTime
- Prisma selective `select`/`include` in many queries
- Pagination on announcements, users, audit logs

### Recommended next steps
1. Split `course-quizzes.tsx` to reduce bundle size for course tab
2. Migrate remaining raw `fetch` uploads to `uploadWithAuth()` (dedupe + consistent CSRF)
3. Add shared `QueryErrorState` to high-traffic pages (courses, announcements, gradebook)
4. Server Components where possible for static dashboard shells
5. Database: index review on hot paths (quiz attempts, messages, announcements)

---

## 8. API Response Standard (Target)

### Errors (existing standard — adopt everywhere)

```json
{
  "status": "error",
  "message": "Something went wrong",
  "details": null
}
```

Use: `throw new HttpError(400, 'message')` + `asyncHandler`, or `sendError(res, 400, 'message')`.

### Success (new helpers — adopt on new endpoints)

```json
{
  "status": "success",
  "message": "Request completed successfully",
  "data": {}
}
```

Use: `sendSuccess(res, data)` from `utils/apiEnvelope.js`.

**Note:** Legacy endpoints still return raw JSON. Migrate gradually — frontend `apiClient` already expects `{ message }` on errors.

---

## 9. Explanation in Simple English

Campus Connect is already a **real, working LMS** with a solid foundation: cookie auth, CSRF, feature folders on the frontend, Prisma on the backend, and domain modules for announcements and discussions.

The main technical debt is **size and inconsistency** — some files grew very large, API errors come in different shapes, and the same URL/upload logic was copied many times.

This refactor pass **did not rewrite the app**. It:
- Removed leftover debug logging
- Created one place for API and socket URLs
- Added reusable upload and error UI helpers
- Documented the full picture and a phased roadmap

The app should behave exactly as before, with cleaner shared utilities for future work.

---

## 10. Next Steps (Priority Order)

### Phase 1 — Quick wins (1–2 days)
- [x] Point remaining services at `getApiBaseUrl()` / `uploadWithAuth()`
- [x] Use `QueryErrorState` on courses, announcements, gradebook pages
- [ ] Merge duplicate `EmptyState` components
- [x] Fix `.env.example` on backend to match `config/env.js`

### Phase 2 — Backend consistency (3–5 days)
- [ ] Standardize new routes on `sendSuccess` / `HttpError` + `asyncHandler` (partial — push routes migrated)
- [x] Unify validation on Joi + `validateRequest` middleware (`validateZod` added for Zod schemas)
- [x] Remove duplicate `auth` middleware from routers (rely on global gate)
- [x] Consolidate bcrypt to `utils/password.js` (`bcryptjs` removed)
- [x] Centralize CORS allowlists via `getCorsAllowlist()` / `getSocketCorsAllowlist()` in `config/env.js`

### Phase 3 — Structural (1–2 weeks)
- [x] Split `course-quizzes.tsx` (shell + student/teacher views, attempt UI, utils, analytics, quiz card, attempts panel)
- [x] Extract `server.js` socket handlers (discussion handlers → `socket/handlers/discussions.js`; server.js ~158 lines)
- [x] Split `servers.js` into sub-routers (core `/servers` routes ~267 lines; channels, members, feed, search, pins, overwrites, messages)
- [x] Split `discussions.js` legacy groups path into sub-routers (~34-line shell; me, attachments, group core/feed/pins/messages, e2e, maintenance)
- [x] Add `backend/tests/` (vitest unit + API smoke tests for auth, course, quiz gates)

### Phase 4 — Polish
- [x] Remove mock `app/api/users` and overview template routes
- [x] Update README / AGENTS.md (Clerk → cookie auth)
- [x] Add E2E smoke tests for auth, course, quiz flows (`backend/tests/smoke/api.smoke.test.js`, `auth.db.smoke.test.js` when DB is up)

---

## How to Use New Frontend Utilities

```ts
// API base URL
import { getApiBaseUrl, buildApiUrl, getSocketUrl } from '@/lib/api-config';

// Multipart upload
import { uploadWithAuth } from '@/lib/upload-client';
const res = await uploadWithAuth('/resources/upload', formData);

// Query error UI
import { QueryErrorState } from '@/components/query-error-state';
if (isError) return <QueryErrorState onRetry={() => refetch()} />;
```

## How to Use New Backend Helpers

```js
import { sendSuccess, sendError, apiErrorBody } from '../utils/apiEnvelope.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

router.get('/example', asyncHandler(async (req, res) => {
  const data = await someService.list();
  return sendSuccess(res, data);
}));

// Or throw for global errorHandler:
throw new HttpError(404, 'Not found');
```

---

*For questions about a specific module, see inline comments in `features/*/api/` and `backend/src/features/`.*
