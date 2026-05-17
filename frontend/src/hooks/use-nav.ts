'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import type { NavItem, NavGroup } from '@/types';

/**
 * Hook to filter navigation items based on RBAC (fully client-side)
 *
 * @param items - Array of navigation items to filter
 * @returns Filtered items
 */
export function useFilteredNavItems(items: NavItem[]) {
  const user = useAuthStore((state) => state.user);

  // Filter items synchronously
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // No access restrictions
        if (!item.access) {
          return true;
        }

        // Require being logged in
        if (!user) {
          return false;
        }

        // Check role
        if (item.access.roles) {
          if (!item.access.roles.includes(user.role)) {
            return false;
          }
        }

        return true;
      })
      .map((item) => {
        // Recursively filter child items
        if (item.items && item.items.length > 0) {
          const filteredChildren = item.items.filter((childItem) => {
            // No access restrictions
            if (!childItem.access) {
              return true;
            }

            if (!user) return false;

            // Check role
            if (childItem.access.roles) {
              if (!childItem.access.roles.includes(user.role)) {
                return false;
              }
            }

            return true;
          });

          return {
            ...item,
            items: filteredChildren
          };
        }

        return item;
      });
  }, [items, user]);

  return filteredItems;
}

/**
 * Hook to filter navigation groups based on RBAC (fully client-side)
 *
 * @param groups - Array of navigation groups to filter
 * @returns Filtered groups (empty groups are removed)
 */
export function useFilteredNavGroups(groups: NavGroup[]) {
  // We need to keep the group structure, but filter the items within each group
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    return groups
      .map((group) => {
        const filteredItems = group.items
          .filter((item) => {
            if (!item.access) return true;
            if (!user) return false;
            if (item.access.roles && !item.access.roles.includes(user.role)) return false;
            return true;
          })
          .map((item) => {
            if (item.items && item.items.length > 0) {
              return {
                ...item,
                items: item.items.filter((sub) => {
                  if (!sub.access) return true;
                  if (!user) return false;
                  if (sub.access.roles && !sub.access.roles.includes(user.role)) return false;
                  return true;
                })
              };
            }
            return item;
          });

        return {
          ...group,
          items: filteredItems
        };
      })
      .filter((group) => group.items.length > 0);
  }, [groups, user]);
}
