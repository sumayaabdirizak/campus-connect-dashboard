# Campus Connect — Backend API Reference

Base URL (local): `http://localhost:4000`  
API prefix: `/api` (most routes). Static files: `/uploads`.

All authenticated routes expect either:

- `Authorization: Bearer <access_jwt>`, and/or  
- HttpOnly cookie `auth_token` (set by `POST /api/auth/login`).

Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) also require header `X-CSRF-Token` matching the `csrf_token` cookie (except `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/csrf`).

---

## 1. Conventions

### 1.1 Error envelope

**From the global `errorHandler`** (thrown `HttpError`, Zod failures, uncaught errors):

```json
{
  "status": "error",
  "message": "Human-readable summary",
  "details": null
}
```

- `details` may be a string, string array, object, or `null`.
- Joi validation failures use `HttpError(400)` → same shape with `details` as an array of messages.
- Some legacy middleware still responds with `{ status: "error", message, details }` directly (auth, CSRF, `requireRole`).

### 1.2 Success list pagination

List endpoints that support pagination return:

```json
{
  "total": 123,
  "page": 1,
  "pageSize": 10,
  "results": []
}
```

Query parameters:

- `page` — 1-based (default `1`).
- `pageSize` or **`limit`** (alias) — capped (default `10`, max `100` unless documented otherwise).

**Implemented in Sprint 2:**

| Endpoint | Notes |
|----------|--------|
| `GET /api/users` | Super Admin only; search `search`, filter `role`. |
| `GET /api/announcements` | After visibility filter, list is paginated in memory. Defaults: `pageSize` 20, max 100. |
| `GET /api/batch-sections` | Scoped for `DEAN` / `FACULTY_ADMIN` / `STUDENT` by faculty; `SUPER_ADMIN` sees all. Optional `batchId`. |
| `GET /api/dean/users` | Dean-only; same envelope (`results` replaces legacy `users` + `pagination`). |

### 1.3 Request logging

Morgan logs: **method**, **URL**, **status**, **response time (ms)** for every request except `GET /health`.

### 1.4 Request validation (Joi)

| Route | Schema |
|-------|--------|
| `POST /api/auth/login` | `email` (required, email), `password` (required, string). |
| `POST /api/users/register` | `full_name`, `email`, `password` (min 8), `role`, `number`, optional `departmentCode`, `programId`, `specialty`, registration fields. |

Other domains (e.g. announcements) use **Zod** in-controller for complex payloads.

---

## 2. Auth

### `POST /api/auth/login`

**Body (Joi):** `{ "email": "string", "password": "string" }`

**200:** `{ csrfToken, user: { id, email, full_name, role, scope } }` — also sets cookies `auth_token`, `refresh_token`.

**400:** Validation failed (Joi).  
**401:** Invalid credentials (`HttpError` → error envelope).

### `POST /api/auth/refresh`

Uses `refresh_token` cookie. **200:** `{ success: true, csrfToken }`.

### `GET /api/auth/csrf`

**200:** `{ csrfToken }` — sets `csrf_token` cookie.

### `POST /api/auth/logout`

Requires auth. Clears auth cookies.

---

## 3. Users (Super Admin)

### `GET /api/users`

**Auth:** Super Admin.  
**Query:** `page`, `pageSize` \| `limit`, `search`, `role`.  
**200:** Paginated envelope (`results` = user rows without `password_hash`).

### `POST /api/users/register`

**Auth:** Super Admin.  
**Body:** Joi schema (see §1.4).  
**201:** `{ message, user: { … } }` (legacy success shape).  
**400 / 409 / 500:** Error envelope or Prisma-mapped conflict.

### `GET /api/users/me`

**Auth:** Any logged-in user.  
**200:** User profile + `scope` from JWT claims.

---

## 4. Scoped helpers (Sprint 1–2)

- **`whereUsersInFaculty(facultyId, extra)`** — Prisma `where` for users in a faculty (students + lecturers with affiliation). Used by Dean user APIs.
- **`whereBatchSectionsInFaculty(facultyId)`** — Sections whose batch → program → department belongs to the faculty. Used by `GET /api/batch-sections` for scoped roles.

Dean routes under `/api/dean/*` use `requireDean` and `req.facultyId` for server-side scope.

---

## 5. Announcements

### `GET /api/announcements`

**Auth:** Required. Returns visible announcements for the caller; **paginated** `results` (not `data`).

**Query:** `page`, `pageSize` \| `limit`.

### `POST /api/announcements`

**Auth:** Super Admin or Dean. **Body:** Zod `createAnnouncementSchema` (includes `targetRoles`, hierarchy fields). Multipart supported for images.

Other announcement routes (`GET /:id`, pin, read, delete) — see `src/controllers/announcements/announcements.js`.

---

## 6. Health

### `GET /health`

No auth. **200:** `{ ok: true, db: true }` or **503** if DB unreachable (shape may differ; not routed through global error handler).

---

## 7. Testing & CI

- **Unit / integration:** `npm test` (Vitest) — RBAC, JWT payload, pagination helpers, standardized 404/400 errors, login Joi validation.
- **CI:** `.github/workflows/ci.yml` runs `npm test` after `prisma migrate deploy` and `prisma db seed`.

### Optional scripts

- `npm run test:announcements:e2e` — announcement E2E script.  
- `npm run test:announcements:security` — security checks.

---

## 8. OpenAPI / Postman (optional)

There is no generated Swagger artifact in-repo yet. Import routes manually into Postman using this document, or generate OpenAPI from route definitions in a future sprint.
