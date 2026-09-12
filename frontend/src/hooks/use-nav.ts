'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { filterNavItems, pathAllowed, roleAllows } from '@/lib/nav-access';
import type { NavItem, NavGroup } from '@/types';

type NavPageRow = {
  id: number;
  slug: string;
  title: string;
  path: string;
  groupLabel?: string | null;
};

type MyNavPagesResponse = {
  user: { id: number; role: string };
  pages: NavPageRow[];
};

function useServerNavPaths(enabled: boolean) {
  return useQuery({
    queryKey: ['rbac', 'me-nav-pages'],
    queryFn: () => apiClient<MyNavPagesResponse>('/rbac/me/nav-pages'),
    enabled,
    staleTime: 60_000
  });
}

/**
 * Filter nav items by client role, then optionally by server RBAC page paths
 * from `GET /api/rbac/me/nav-pages`. Falls back to role-only filter if the
 * API is unavailable (keeps sidebar usable during outages).
 */
export function useFilteredNavItems(items: NavItem[]) {
  const user = useAuthStore((state) => state.user);
  const navQuery = useServerNavPaths(Boolean(user));
  const allowedPaths = useMemo(() => {
    const pages = navQuery.data?.pages;
    if (!pages?.length) return null;
    return new Set(pages.map((p) => p.path));
  }, [navQuery.data?.pages]);

  return useMemo(
    () => filterNavItems(items, user?.role, allowedPaths),
    [items, user?.role, allowedPaths]
  );
}

/**
 * Filter navigation groups — role gate + server nav-page allowlist.
 */
export function useFilteredNavGroups(groups: NavGroup[]) {
  const user = useAuthStore((state) => state.user);
  const navQuery = useServerNavPaths(Boolean(user));
  const allowedPaths = useMemo(() => {
    const pages = navQuery.data?.pages;
    if (!pages?.length) return null;
    return new Set(pages.map((p) => p.path));
  }, [navQuery.data?.pages]);

  return useMemo(() => {
    return groups
      .map((group) => ({
        ...group,
        items: filterNavItems(group.items, user?.role, allowedPaths)
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, user?.role, allowedPaths]);
}

export { roleAllows, pathAllowed, filterNavItems, flattenNavItems };
