'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import type { Announcement } from './types';
import { isAnnouncementTimelyPinned } from '../utils/announcementPin';
import { announcementMatchesAudienceRole } from '../utils/announcementAudienceFilter';
import type {
  AnnouncementRealtimePayload,
  AnnouncementUpdatedPayload,
  AnnouncementExpiredPayload,
  AnnouncementDeadlineReminderPayload
} from './socket-payloads';

let announcementSocket: Socket | null = null;

function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
}

function playNotificationSound() {
  if (typeof window === 'undefined') return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
}

function getJwtToken(explicitToken?: string | null): string | null {
  if (explicitToken) return explicitToken;
  if (typeof window === 'undefined') return null;
  return (
    window.sessionStorage.getItem('auth_token') || window.localStorage.getItem('auth_token') || null
  );
}

const IS_NEW_DAYS = Number(process.env.NEXT_PUBLIC_ANNOUNCEMENT_NEW_DAYS) || 7;

function toAnnouncement(payload: AnnouncementRealtimePayload): Announcement {
  return {
    id: payload.id,
    title: payload.title,
    content: payload.content,
    priority: payload.priority,
    targetType: payload.targetType,
    status: payload.status as Announcement['status'],
    expiresAt: payload.expiresAt ?? undefined,
    targeting: payload.targeting,
    imageUrls: payload.imageUrls ?? [],
    targetRoles: payload.targetRoles ?? [],
    isActive: payload.isActive !== false,
    createdAt: payload.createdAt,
    createdBy: {
      id: 'system',
      name: 'System',
      role: 'SUPER_ADMIN'
    },
    isRead: false
  };
}

function isAnnouncementNewForSort(a: Announcement): boolean {
  if (a.isRead) return false;
  const created = a.createdAt || a.created_at;
  if (!created) return false;
  const ageMs = Date.now() - new Date(created).getTime();
  return ageMs >= 0 && ageMs < IS_NEW_DAYS * 24 * 60 * 60 * 1000;
}

/** Scheduled tab cache: soonest publish time first (matches `AnnouncementFeed`). */
function sortScheduledList(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => {
    const at = new Date(a.publishedAt || a.createdAt || a.created_at || 0).getTime();
    const bt = new Date(b.publishedAt || b.createdAt || b.created_at || 0).getTime();
    return at - bt;
  });
}

/** Same ordering as the API list: pinned → new → createdAt desc */
export function sortAnnouncementsForDisplay(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => {
    const ap = isAnnouncementTimelyPinned(a);
    const bp = isAnnouncementTimelyPinned(b);
    if (ap !== bp) return ap ? -1 : 1;
    const aNew = isAnnouncementNewForSort(a);
    const bNew = isAnnouncementNewForSort(b);
    if (aNew !== bNew) return aNew ? -1 : 1;
    const ac = new Date(a.createdAt || a.created_at || 0).getTime();
    const bc = new Date(b.createdAt || b.created_at || 0).getTime();
    return bc - ac;
  });
}

export type AnnouncementSocketDiagnostics = {
  /** When set, `announcement:new` is only merged if this returns true (integration / diagnostic mode). */
  shouldAcceptNewAnnouncement?: (payload: AnnouncementRealtimePayload) => boolean;
  onAnnouncementNew?: (payload: AnnouncementRealtimePayload, accepted: boolean) => void;
  onAnnouncementUpdated?: (payload: AnnouncementUpdatedPayload) => void;
  onDuplicateBlocked?: (id: string | number) => void;
};

/** Set from announcements diagnostics view so dashboard-level socket can mirror visibility rules. */
let announcementSocketDiagnosticsRef: AnnouncementSocketDiagnostics | undefined;

export function setAnnouncementSocketDiagnosticsRef(next: AnnouncementSocketDiagnostics | undefined) {
  announcementSocketDiagnosticsRef = next;
}

type UseAnnouncementSocketOptions = {
  enabled?: boolean;
  token?: string | null;
  playSound?: boolean;
  diagnostics?: AnnouncementSocketDiagnostics;
};

export function disconnectAnnouncementSocket() {
  if (announcementSocket) {
    announcementSocket.disconnect();
    announcementSocket = null;
  }
}

export function getAnnouncementSocket(): Socket | null {
  return announcementSocket;
}

export function useAnnouncementSocket(options: UseAnnouncementSocketOptions = {}) {
  const { enabled = true, token = null, playSound = false, diagnostics } = options;
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      disconnectAnnouncementSocket();
      return;
    }

    const jwtToken = getJwtToken(token);
    const socket =
      announcementSocket ??
      io(getSocketUrl(), {
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        auth: jwtToken ? { token: jwtToken } : undefined
      });

    announcementSocket = socket;

    const handleAnnouncement = (payload: AnnouncementRealtimePayload) => {
      const diag = diagnostics ?? announcementSocketDiagnosticsRef;
      const accept =
        diag?.shouldAcceptNewAnnouncement == null ? true : diag.shouldAcceptNewAnnouncement(payload);
      diag?.onAnnouncementNew?.(payload, accept);
      if (!accept) {
        return;
      }

      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'scheduled'], (current = []) =>
        current.filter((item) => String(item.id) !== String(payload.id))
      );

      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'list'], (current, key) => {
        const audience = typeof key[2] === 'string' ? key[2] : 'ALL';
        const item = toAnnouncement(payload);
        if (!announcementMatchesAudienceRole(item, audience)) {
          return current ?? [];
        }
        const cur = current ?? [];
        const alreadyExists = cur.some((it) => String(it.id) === String(payload.id));
        if (alreadyExists) {
          diag?.onDuplicateBlocked?.(payload.id);
          queueMicrotask(() => {
            queryClient.invalidateQueries({ queryKey: ['announcements', 'list'] });
          });
          return cur;
        }
        const next = [item, ...cur];
        return sortAnnouncementsForDisplay(next);
      });

      toast.success('New announcement', {
        description: payload.title
      });

      if (playSound) {
        playNotificationSound();
      }
      queryClient.invalidateQueries({ queryKey: ['announcements', 'unread-count'] });
    };

    const handleAnnouncementUpdated = (payload: AnnouncementUpdatedPayload) => {
      if (payload == null || payload.id == null) return;
      const diag = diagnostics ?? announcementSocketDiagnosticsRef;
      diag?.onAnnouncementUpdated?.(payload);

      const id = payload.id;
      const statusUpper = payload.status != null ? String(payload.status).toUpperCase() : null;
      let invalidateMainList = false;

      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'list'], (current, key) => {
        const audience = typeof key[2] === 'string' ? key[2] : 'ALL';
        const idx = (current ?? []).findIndex((item) => String(item.id) === String(id));
        if (idx === -1) {
          if (statusUpper === 'PUBLISHED' || statusUpper === 'DRAFT') {
            invalidateMainList = true;
          }
          return current ?? [];
        }
        const cur = current ?? [];
        const prev = cur[idx]!;
        const merged: Announcement = {
          ...prev,
          isPinned: payload.isPinned,
          updatedAt: payload.updatedAt,
          ...(payload.status != null ? { status: payload.status as Announcement['status'] } : {}),
          ...(payload.expiresAt !== undefined ? { expiresAt: payload.expiresAt } : {})
        };
        if (!announcementMatchesAudienceRole(merged, audience)) {
          return cur.filter((item) => String(item.id) !== String(id));
        }
        const next = [...cur];
        next[idx] = merged;
        return sortAnnouncementsForDisplay(next);
      });

      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'scheduled'], (current = []) => {
        const cur = current ?? [];
        const idx = cur.findIndex((item) => String(item.id) === String(id));
        if (idx === -1) return cur;

        if (
          statusUpper === 'PUBLISHED' ||
          statusUpper === 'DRAFT' ||
          statusUpper === 'ARCHIVED' ||
          statusUpper === 'EXPIRED'
        ) {
          return cur.filter((item) => String(item.id) !== String(id));
        }

        const next = [...cur];
        const prev = next[idx]!;
        next[idx] = {
          ...prev,
          isPinned: payload.isPinned,
          updatedAt: payload.updatedAt,
          ...(payload.status != null ? { status: payload.status as Announcement['status'] } : {}),
          ...(payload.expiresAt !== undefined ? { expiresAt: payload.expiresAt } : {})
        };
        return sortScheduledList(next);
      });

      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'drafts'], (current = []) => {
        const cur = current ?? [];
        const idx = cur.findIndex((item) => String(item.id) === String(id));
        if (statusUpper != null && statusUpper !== 'DRAFT') {
          return cur.filter((item) => String(item.id) !== String(id));
        }
        if (idx === -1) return cur;
        const next = [...cur];
        const prev = next[idx]!;
        next[idx] = {
          ...prev,
          isPinned: payload.isPinned,
          updatedAt: payload.updatedAt,
          ...(payload.status != null ? { status: payload.status as Announcement['status'] } : {}),
          ...(payload.expiresAt !== undefined ? { expiresAt: payload.expiresAt } : {})
        };
        return next;
      });

      if (payload.status != null) {
        void queryClient.invalidateQueries({ queryKey: ['announcements', 'drafts-count'] });
      }

      if (invalidateMainList) {
        queueMicrotask(() => {
          void queryClient.invalidateQueries({ queryKey: ['announcements', 'list'] });
        });
      }
    };

    const handleAnnouncementExpired = (payload: AnnouncementExpiredPayload) => {
      if (payload?.id == null) return;
      const removeById = (current: Announcement[] = []) =>
        current.filter((item) => String(item.id) !== String(payload.id));
      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'list'], (cur) =>
        removeById(cur ?? [])
      );
      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'scheduled'], (cur) =>
        removeById(cur ?? [])
      );
      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'drafts'], (cur) =>
        removeById(cur ?? [])
      );
      queryClient.invalidateQueries({ queryKey: ['announcements', 'unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['announcements', 'drafts-count'] });
    };

    const handleConnectError = (err: Error) => {
      console.warn('Announcement socket connect_error:', err?.message || err);
    };

    const handleDeadlineReminder = (payload: AnnouncementDeadlineReminderPayload) => {
      if (payload?.id == null) return;
      const when = payload.phase === 'T24H' ? 'in 24 hours' : 'in 1 hour';
      toast.message('Deadline reminder', {
        description: `${payload.title} — due ${when}`
      });
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
    };

    socket.on('announcement:new', handleAnnouncement);
    socket.on('announcement:updated', handleAnnouncementUpdated);
    socket.on('announcement:expired', handleAnnouncementExpired);
    socket.on('announcement:deadline_reminder', handleDeadlineReminder);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('announcement:new', handleAnnouncement);
      socket.off('announcement:updated', handleAnnouncementUpdated);
      socket.off('announcement:expired', handleAnnouncementExpired);
      socket.off('announcement:deadline_reminder', handleDeadlineReminder);
      socket.off('connect_error', handleConnectError);
    };
  }, [enabled, isAuthenticated, playSound, queryClient, token, diagnostics]);
}
