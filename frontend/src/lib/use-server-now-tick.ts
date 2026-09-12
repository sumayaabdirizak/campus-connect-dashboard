'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/server-clock';

/**
 * Re-render on an interval using skew-corrected server time.
 * Use so open/due/closed UI flips when the window arrives without a page refresh.
 */
export function useServerNowTick(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    if (!enabled) return;
    setNow(serverNow());
    const id = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);

  return now;
}
