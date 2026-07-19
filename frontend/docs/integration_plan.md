# Backend API integration (archived sketch)

> **Current auth:** HttpOnly cookies + CSRF — see [auth.md](./auth.md).  
> This file previously described a Bearer-token + `localStorage` plan that is **not** how Campus Connect works.

Use:

- `src/lib/api-client.ts` — `credentials: 'include'`, CSRF header on mutations
- `src/lib/auth-store.ts` — user profile only (no JWT in storage)
- Root [docs/SYSTEM_DESIGN.md](../../docs/SYSTEM_DESIGN.md) and [docs/SECURITY.md](../../docs/SECURITY.md) for stack overview
