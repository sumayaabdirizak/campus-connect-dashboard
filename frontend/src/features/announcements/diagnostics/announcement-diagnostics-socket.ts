'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { Announcement } from '../api/types';
import type { AnnouncementSocketDiagnostics } from '../api/use-announcement-socket';
import {
  announcementDtoToVisibilityShape,
  socketNewPayloadToVisibilityShape,
} from './announcement-diagnostics';
import { canUserSeeAnnouncement, type VisibleAnnouncementUser } from './visibility-mirror';

export function useAnnouncementVisibilityFilter(
  enabled: boolean,
  visibilityUser: VisibleAnnouncementUser | null,
  announcements: Announcement[]
) {
  return useMemo(() => {
    if (!enabled || !visibilityUser) return announcements;
    return announcements.filter((a) =>
      canUserSeeAnnouncement(visibilityUser, announcementDtoToVisibilityShape(a))
    );
  }, [enabled, visibilityUser, announcements]);
}

export function useAnnouncementSocketDiagnosticsConfig(enabled: boolean) {
  const visibilityUserRef = useRef<VisibleAnnouncementUser | null>(null);

  const setVisibilityUserRef = useCallback((user: VisibleAnnouncementUser | null) => {
    visibilityUserRef.current = user;
  }, []);

  const socketDiagnostics = useMemo((): AnnouncementSocketDiagnostics | undefined => {
    if (!enabled) return undefined;
    return {
      shouldAcceptNewAnnouncement: (payload) => {
        const vu = visibilityUserRef.current;
        if (!vu) return true;
        return canUserSeeAnnouncement(vu, socketNewPayloadToVisibilityShape(payload));
      },
      onAnnouncementNew: (payload, accepted) => {
        console.log('SOCKET EVENT RECEIVED:', payload.id);
        if (!accepted) console.log('SOCKET: ignored (not visible):', payload.id);
      },
      onAnnouncementUpdated: (payload) => {
        console.log('PIN UPDATED:', payload.id, payload.isPinned);
      },
      onDuplicateBlocked: (id) => console.log('DUPLICATE BLOCKED:', id),
    };
  }, [enabled]);

  return { socketDiagnostics, setVisibilityUserRef };
}
