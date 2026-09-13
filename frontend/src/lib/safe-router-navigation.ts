'use client';

import { startTransition } from 'react';

type RouterLike = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
  push: (href: string, options?: { scroll?: boolean }) => void;
};

/** Run App Router navigation after the client router action queue is ready. */
function runWhenRouterReady(run: () => void) {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    startTransition(run);
  });
}

export function scheduleRouterReplace(
  router: RouterLike,
  href: string,
  options?: { scroll?: boolean }
) {
  runWhenRouterReady(() => router.replace(href, options));
}

export function scheduleRouterPush(
  router: RouterLike,
  href: string,
  options?: { scroll?: boolean }
) {
  runWhenRouterReady(() => router.push(href, options));
}

export function hrefWithSearchParams(pathname: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
