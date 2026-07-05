'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { navGroups } from '@/config/nav-config';

const SESSION_CACHE_TTL_MS = 45 * 1000;
let lastSessionCheckAt = 0;
let lastSessionCheckResult = false;
let inFlightSessionCheck: Promise<boolean> | null = null;

async function getValidatedSession(validateSession: () => Promise<boolean>): Promise<boolean> {
  const now = Date.now();
  if (now - lastSessionCheckAt < SESSION_CACHE_TTL_MS) {
    return lastSessionCheckResult;
  }

  if (!inFlightSessionCheck) {
    inFlightSessionCheck = validateSession()
      .then((result) => {
        lastSessionCheckAt = Date.now();
        lastSessionCheckResult = result;
        return result;
      })
      .finally(() => {
        inFlightSessionCheck = null;
      });
  }

  return inFlightSessionCheck;
}

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, validateSession, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    setIsMounted(true);

    async function verifyAuth() {
      const ok = await getValidatedSession(validateSession);
      if (!ok && pathname.startsWith('/dashboard')) {
        lastSessionCheckAt = 0;
        lastSessionCheckResult = false;
        clearAuth();
        router.push('/auth/sign-in');
      }
      setIsLoading(false);
    }

    verifyAuth();
  }, [validateSession, clearAuth, router, pathname]);

  useEffect(() => {
    if (isMounted && !isLoading && isAuthenticated && pathname.startsWith('/dashboard')) {
      // The `/dashboard` index is a role dispatcher (renders the right
      // dashboard per role), not a gated section. Every authenticated role can
      // land here — and it's the redirect target for denied subroutes, so it
      // must never deny, or a denied role would loop. Per-section access for
      // `/dashboard/*` is still enforced below.
      if (pathname === '/dashboard') {
        setIsAuthorized(true);
      } else {
        // Find matches in navGroups
        const allNavItems = navGroups.flatMap((group) =>
          group.items.flatMap((item) => [item, ...(item.items || [])])
        );

        // Check if any nav item matches the current pathname exactly or as a parent
        // Sort by length descending to get the most specific match first
        const applicableItems = allNavItems.filter(
          (item) => pathname === item.url || pathname.startsWith(item.url + '/')
        );

        if (applicableItems.length > 0) {
          // Find the most specific match (longest URL)
          const maxLen = Math.max(...applicableItems.map((i) => i.url.length));
          const mostSpecificItems = applicableItems.filter((i) => i.url.length === maxLen);

          // Access is allowed if ANY of the most specific matches allow the role
          // or if they don't have role restrictions.
          const isAllowed = mostSpecificItems.some(
            (item) =>
              !item.access ||
              !item.access.roles ||
              (user ? item.access.roles.includes(user.role) : false)
          );

          if (!isAllowed) {
            console.warn(`Access denied for role ${user?.role} at ${pathname}`);
            setIsAuthorized(false);
            router.push('/dashboard');
            return;
          }
        }
        setIsAuthorized(true);
      }
    }

    if (isMounted && !isLoading && !isAuthenticated && pathname !== '/auth/sign-in') {
      router.push('/auth/sign-in');
    }
  }, [isAuthenticated, router, pathname, isMounted, isLoading, user]);

  if (
    !isMounted ||
    isLoading ||
    !isAuthorized ||
    (!isAuthenticated && pathname !== '/auth/sign-in')
  ) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  return <>{children}</>;
}
