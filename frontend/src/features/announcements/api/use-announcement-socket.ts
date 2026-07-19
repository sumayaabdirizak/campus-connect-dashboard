'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import {
  setAnnouncementSocketDiagnosticsRef,
  type AnnouncementSocketDiagnostics,
} from './announcement-socket-diagnostics';
import { createAnnouncementSocketHandlers } from './announcement-socket-handlers';
import {
  disconnectAnnouncementSocket,
  getAnnouncementSocket,
  getOrCreateAnnouncementSocket,
} from './announcement-socket-instance';
import { sortAnnouncementsForDisplay } from './announcement-socket-sort';

export { sortAnnouncementsForDisplay };
export {
  setAnnouncementSocketDiagnosticsRef,
  disconnectAnnouncementSocket,
  getAnnouncementSocket,
};
export type { AnnouncementSocketDiagnostics };

type UseAnnouncementSocketOptions = {
  enabled?: boolean;
  token?: string | null;
  playSound?: boolean;
  diagnostics?: AnnouncementSocketDiagnostics;
};

export function useAnnouncementSocket(options: UseAnnouncementSocketOptions = {}) {
  const { enabled = true, token = null, playSound = false, diagnostics } = options;
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      disconnectAnnouncementSocket();
      return;
    }

    const socket = getOrCreateAnnouncementSocket(token);
    const handlers = createAnnouncementSocketHandlers({ queryClient, playSound, diagnostics });

    socket.on('announcement:new', handlers.handleAnnouncement);
    socket.on('announcement:updated', handlers.handleAnnouncementUpdated);
    socket.on('announcement:expired', handlers.handleAnnouncementExpired);
    socket.on('announcement:deadline_reminder', handlers.handleDeadlineReminder);
    socket.on('connect_error', handlers.handleConnectError);

    return () => {
      socket.off('announcement:new', handlers.handleAnnouncement);
      socket.off('announcement:updated', handlers.handleAnnouncementUpdated);
      socket.off('announcement:expired', handlers.handleAnnouncementExpired);
      socket.off('announcement:deadline_reminder', handlers.handleDeadlineReminder);
      socket.off('connect_error', handlers.handleConnectError);
    };
  }, [enabled, isAuthenticated, playSound, queryClient, token, diagnostics]);
}
