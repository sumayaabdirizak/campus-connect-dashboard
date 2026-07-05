# Navigation RBAC

## Overview

Sidebar and command-palette items are filtered **client-side** for UX. Security is enforced by the Express API on every protected route.

## Core files

1. **`src/config/nav-config.ts`** — nav groups and `access` rules per item
2. **`src/hooks/use-nav.ts`** — `useFilteredNavItems()` filters by signed-in `user.role`
3. **`src/lib/auth-store.ts`** — current user from cookie session

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

`useFilteredNavItems()` only evaluates **`roles`** today. Legacy template fields (`requireOrg`, `permission`, `plan`, `feature`) remain on the `PermissionCheck` type but are not used by the hook.

## Usage in components

```typescript
import { useFilteredNavItems } from '@/hooks/use-nav';

function SidebarNav({ items }: { items: NavItem[] }) {
  const filtered = useFilteredNavItems(items);
  // render filtered
}
```

## Best practices

1. **Always set `access.roles`** for items that are not universal.
2. **Do not rely on nav hiding for security** — protect pages with session checks and let the API return 403/401.
3. **Keep roles aligned** with `src/types/auth.ts` and backend RBAC.

## Page-level protection

Client pages typically read `useAuthStore` and redirect unauthenticated users to `/auth/sign-in`. Server Components that need the user should call the backend with forwarded cookies or use client guards consistent with the rest of the app.
