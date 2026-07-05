# Authentication (Campus Connect)

Campus Connect uses the **Express backend** for authentication. The Next.js frontend never stores JWTs in `localStorage`.

## Flow

1. User signs in at `/auth/sign-in` → `POST /api/auth/login` with `{ email, password }` and `credentials: 'include'`.
2. Backend sets HttpOnly cookies: `auth_token` (access) and `refresh_token`.
3. Backend returns `{ csrfToken, user }` in the JSON body; the frontend stores `user` in `useAuthStore`.
4. Mutating API calls (`POST`, `PATCH`, `DELETE`) send `X-CSRF-Token` matching the `csrf_token` cookie (double-submit pattern).
5. Session refresh: `POST /api/auth/refresh` (also cookie-based). Logout: `POST /api/auth/logout`.
6. Client validates session on load via `GET /api/users/me` (`validateSession()` in `src/lib/auth-store.ts`).

## Environment

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

Backend must set `JWT_SECRET` and `CORS_ORIGINS` / `FRONTEND_URL` so credentialed requests from `http://localhost:3000` succeed.

## Roles

Users have a single campus role (e.g. `STUDENT`, `TEACHER`, `DEAN`, `SUPER_ADMIN`). Navigation is filtered by `access.roles` in `src/config/nav-config.ts`. **API routes enforce authorization** — hiding a nav item is UX only.

## Seed credentials

After `npm run prisma:seed` in `backend/`, demo users use password `password123` (see `backend/prisma/seed.js`).

## Related files

| File | Purpose |
|------|---------|
| `src/lib/auth-store.ts` | Zustand session + `validateSession` |
| `src/lib/api-client.ts` | Fetch wrapper with cookies + CSRF |
| `src/lib/api-config.ts` | `NEXT_PUBLIC_API_URL` normalization |
| `backend/src/controllers/auth/` | Login, refresh, logout, CSRF |
| `backend/src/middleware/auth.js` | Global `/api` gate (cookie or Bearer) |
