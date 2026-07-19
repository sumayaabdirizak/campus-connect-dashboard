import type { NavItem } from '@/types';
import type { Role } from '@/types/auth';

/** Whether a nav item's role ACL allows the given user role. */
export function roleAllows(item: NavItem, role: Role | undefined): boolean {
  if (!item.access) return true;
  if (!role) return false;
  if (item.access.roles && !item.access.roles.includes(role)) return false;
  return true;
}

/**
 * Server RBAC path allowlist. `null` means "no server list yet — role-only".
 * Dashboard root always allowed so users aren't locked out of home.
 */
export function pathAllowed(url: string, allowed: Set<string> | null): boolean {
  if (!allowed) return true;
  if (url === '/dashboard') return true;
  return allowed.has(url);
}

/** Filter a flat nav item list by role + optional path allowlist. */
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
          items: item.items.filter(
            (child) => roleAllows(child, role) && pathAllowed(child.url, allowed)
          )
        };
      }
      return item;
    });
}
