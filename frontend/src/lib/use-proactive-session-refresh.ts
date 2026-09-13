'use client';

import { useEffect } from 'react';
import { tryRefreshAccessToken } from '@/lib/api-client';

/** Refresh the access cookie before it expires (default 15m). Keeps sessions alive across tabs. */
const REFRESH_EVERY_MS = 12 * 60 * 1000;

export function useProactiveSessionRefresh(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.hidden) return;
      void tryRefreshAccessToken();
    };

    const id = window.setInterval(tick, REFRESH_EVERY_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}
