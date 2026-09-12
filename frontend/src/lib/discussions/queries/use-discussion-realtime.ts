'use client';

import { useEffect } from 'react';
import { ensureSocket } from '@/lib/discussions/queries/socket-connection';

/**
 * Keep the shared discussion/club socket connected for the whole dashboard
 * so membership events, DMs, and club feed invalidations arrive without
 * waiting for the user to open Messages.
 */
export function useDiscussionRealtime(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    ensureSocket();
  }, [enabled]);
}
