import { toast } from 'sonner';
import type { AsyncQueryClient } from '@/lib/async-query';
import type { Announcement } from '../types';
import { announcementMatchesAudienceRole } from './announcementAudienceFilter';
import type {
  AnnouncementDeadlineReminderPayload,
  AnnouncementExpiredPayload,
  AnnouncementRealtimePayload,
  AnnouncementUpdatedPayload,
} from './socket-payloads';
import {
  getAnnouncementSocketDiagnosticsRef,
  type AnnouncementSocketDiagnostics,
} from './announcement-socket-diagnostics';
import { sortAnnouncementsForDisplay, sortScheduledList } from './announcement-socket-sort';
import { playNotificationSound, toAnnouncement } from './announcement-socket-utils';

type HandlerContext = {
  queryClient: AsyncQueryClient;
  playSound: boolean;
  diagnostics?: AnnouncementSocketDiagnostics;
};

function resolveDiagnostics(diagnostics?: AnnouncementSocketDiagnostics) {
  return diagnostics ?? getAnnouncementSocketDiagnosticsRef();
}

export function createAnnouncementSocketHandlers(ctx: HandlerContext) {
  const { queryClient, playSound, diagnostics } = ctx;

  const handleAnnouncement = (payload: AnnouncementRealtimePayload) => {
    const diag = resolveDiagnostics(diagnostics);
    const accept =
      diag?.shouldAcceptNewAnnouncement == null ? true : diag.shouldAcceptNewAnnouncement(payload);
    diag?.onAnnouncementNew?.(payload, accept);
    if (!accept) return;

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

    toast.success('New announcement', { description: payload.title });
    if (playSound) playNotificationSound();
    queryClient.invalidateQueries({ queryKey: ['announcements', 'unread-count'] });
  };

  const handleAnnouncementUpdated = (payload: AnnouncementUpdatedPayload) => {
    if (payload == null || payload.id == null) return;
    const diag = resolveDiagnostics(diagnostics);
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
        ...(payload.expiresAt !== undefined ? { expiresAt: payload.expiresAt } : {}),
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
        ...(payload.expiresAt !== undefined ? { expiresAt: payload.expiresAt } : {}),
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
        ...(payload.expiresAt !== undefined ? { expiresAt: payload.expiresAt } : {}),
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
    const msg = err?.message || String(err);
    // Auth recovery logs/handles Unauthorized separately; CORS/transport noise
    // is expected briefly while the client falls back to polling.
    if (/unauthor|forbidden|jwt|expired|auth/i.test(msg)) return;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Announcement socket connect_error:', msg);
    }
  };

  const handleDeadlineReminder = (payload: AnnouncementDeadlineReminderPayload) => {
    if (payload?.id == null) return;
    const when = payload.phase === 'T24H' ? 'in 24 hours' : 'in 1 hour';
    toast.message('Deadline reminder', {
      description: `${payload.title} — due ${when}`,
    });
    void queryClient.invalidateQueries({ queryKey: ['calendar'] });
  };

  return {
    handleAnnouncement,
    handleAnnouncementUpdated,
    handleAnnouncementExpired,
    handleConnectError,
    handleDeadlineReminder,
  };
}
