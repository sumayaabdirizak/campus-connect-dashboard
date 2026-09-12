import type { NavItem } from '@/types';
import type { Role } from '@/types/auth';

/** Whether a nav item's role ACL allows the given user role. */
export function roleAllows(item: NavItem, role: Role | undefined): boolean {
  if (!item.access) return true;
  if (!role) return false;
  if (item.access.roles && !item.access.roles.includes(role)) return false;
  return true;
}

/** Match nav paths; query strings are ignored for RBAC allowlists. */
export function pathAllowed(url: string, allowed: Set<string> | null): boolean {
  if (!allowed) return true;
  const path = url.split('?')[0];
  if (path === '/dashboard') return true;
  return allowed.has(url) || allowed.has(path);
}

/** Flatten nested nav items (parent + all descendants). */
export function flattenNavItems(items: NavItem[]): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.items?.length) out.push(...flattenNavItems(item.items));
  }
  return out;
}

/** Filter a nav item list by role + optional path allowlist (recursive). */
export function filterNavItems(
  items: NavItem[],
  role: Role | undefined,
  allowed: Set<string> | null
): NavItem[] {
  return items
    .filter((item) => roleAllows(item, role) && pathAllowed(item.url, allowed))
    .map((item) => {
      if (item.items && item.items.length > 0) {
        return {
          ...item,
          items: filterNavItems(item.items, role, allowed)
        };
      }
      return item;
    })
    .filter((item) => !item.items || item.items.length > 0);
}
