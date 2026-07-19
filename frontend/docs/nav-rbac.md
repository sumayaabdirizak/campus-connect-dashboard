# Navigation RBAC

## Overview

Sidebar items are filtered for UX in two layers:

1. **Client role** — `access.roles` on `nav-config.ts` (always applied).
2. **Server nav pages** — `GET /api/rbac/me/nav-pages` path allowlist (when available). If the API fails or returns empty, the sidebar falls back to role-only filtering.

**Security is still enforced by the Express API** on every protected route. Hiding a nav item is not authorization.

## Core files

1. **`src/config/nav-config.ts`** — nav groups and `access` rules per item
2. **`src/hooks/use-nav.ts`** — `useFilteredNavGroups` / `useFilteredNavItems`
3. **`backend/src/config/navPages.registry.js`** — registry synced to `NavPage` / `RoleNavPermission`
4. **`src/lib/auth-store.ts`** — current user from cookie session

## Access rules

In `nav-config.ts`, use `access.roles` with campus roles:

```typescript
{
  title: 'Dashboard',
  url: '/dashboard',
  icon: 'dashboard',
  access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
}
```

Sync server registry: `cd backend && npm run rbac:sync` (or `POST /api/rbac/pages/sync` as SUPER_ADMIN).

## Best practices

- Keep `nav-config.ts` paths aligned with registry `path` values so server filtering matches.
- Never rely on the sidebar alone for secrets or admin actions — API RBAC is the source of truth.
- Prefer announcements a11y patterns (`role="status"` empty states, labeled controls) on new surfaces.
