'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@/lib/async-query';
import type { Announcement } from '../api/types';
import {
  getAnnouncementMeVisibility,
  getAnnouncementUnreadCount,
  setAnnouncementDiagnosticForceApiFailure
} from '../api/service';
import type { AnnouncementSocketDiagnostics } from '../api/use-announcement-socket';
import { getAnnouncementSocket } from '../api/use-announcement-socket';
import {
  announcementDtoToVisibilityShape,
  checkDeanFacultyAlignment,
  isPinnedNewestOrdering,
  printFinalReport,
  runApiFetchChecks,
  runVisibilityChecks,
  socketNewPayloadToVisibilityShape,
  type DiagnosticReport
} from './announcement-diagnostics';
import { canUserSeeAnnouncement, type VisibleAnnouncementUser } from './visibility-mirror';

export function isAnnouncementDiagnosticsEnabled(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_ANNOUNCEMENT_DIAGNOSTIC === 'true'
  ) {
    return true;
  }
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('announcementDiag') === '1';
  } catch {
    return false;
  }
}

function hasUniqueAnnouncementIds(list: Announcement[]): boolean {
  const ids = new Set(list.map((a) => String(a.id)));
  return ids.size === list.length;
}

export function useAnnouncementDiagnostics(options: {
  enabled: boolean;
  announcements: Announcement[];
  isLoading: boolean;
  error: Error | null;
  userRole: string | undefined;
}) {
  const { enabled, announcements, isLoading, error, userRole } = options;
  const queryClient = useQueryClient();
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [readFlowOk, setReadFlowOk] = useState(false);
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [errorSimOk, setErrorSimOk] = useState(false);
  const unreadBeforeReadRef = useRef<number | null>(null);
  const visibilityUserRef = useRef<VisibleAnnouncementUser | null>(null);

  const meVisibilityQuery = useQuery({
    queryKey: ['announcements', 'diagnostics', 'me-visibility'],
    queryFn: getAnnouncementMeVisibility,
    enabled,
    staleTime: 60_000
  });

  const unreadQuery = useQuery({
    queryKey: ['announcements', 'unread-count'],
    queryFn: getAnnouncementUnreadCount,
    enabled,
    refetchInterval: enabled ? 20_000 : false
  });

  const visibilityUser = meVisibilityQuery.data?.visibilityUser ?? null;
  const deanPrimaryFacultyId = meVisibilityQuery.data?.deanPrimaryFacultyId ?? null;

  useEffect(() => {
    visibilityUserRef.current = visibilityUser;
  }, [visibilityUser]);

  useEffect(() => {
    if (!enabled) return;
    const poll = () => {
      const s = getAnnouncementSocket();
      setSocketConnected(!!s?.connected);
    };
    poll();
    const s = getAnnouncementSocket();
    if (s) {
      s.on('connect', poll);
      s.on('disconnect', poll);
      return () => {
        s.off('connect', poll);
        s.off('disconnect', poll);
      };
    }
    const id = window.setInterval(poll, 500);
    return () => window.clearInterval(id);
  }, [enabled]);

  const safeAnnouncements = useMemo(() => {
    if (!enabled || !visibilityUser) return announcements;
    return announcements.filter((a) =>
      canUserSeeAnnouncement(visibilityUser, announcementDtoToVisibilityShape(a))
    );
  }, [enabled, visibilityUser, announcements]);

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
        if (!accepted) {
          console.log('SOCKET: ignored (not visible):', payload.id);
        }
      },
      onAnnouncementUpdated: (payload) => {
        console.log('PIN UPDATED:', payload.id, payload.isPinned);
      },
      onDuplicateBlocked: (id) => {
        console.log('DUPLICATE BLOCKED:', id);
      }
    };
  }, [enabled]);

  const recomputeReport = useCallback(() => {
    if (!enabled) return;
    const details: string[] = [];

    const apiResult = runApiFetchChecks(announcements);
    if (!isLoading && error == null) {
      console.log('ANNOUNCEMENTS LOADED:', announcements.length);
    }
    if (!apiResult.pass) details.push(...apiResult.reasons.map((r) => `apiFetch: ${r}`));

    let vis: { pass: boolean; leaks: { id: unknown; reason: string }[] };
    if (meVisibilityQuery.isError) {
      const msg = meVisibilityQuery.error?.message ?? 'me-visibility failed';
      details.push(`me-visibility: ${msg}`);
      vis = { pass: false, leaks: [{ id: null, reason: msg }] };
    } else if (meVisibilityQuery.isSuccess && visibilityUser) {
      vis = runVisibilityChecks(visibilityUser, announcements);
    } else {
      vis = { pass: true, leaks: [] };
    }
    if (!vis.pass) {
      for (const leak of vis.leaks) {
        details.push(`visibility: id=${leak.id} — ${leak.reason}`);
      }
    }

    const dean =
      userRole === 'DEAN' && meVisibilityQuery.isSuccess
        ? checkDeanFacultyAlignment(userRole, deanPrimaryFacultyId, announcements)
        : { ok: true, offenders: [] as { id: unknown; reason: string }[] };
    if (!dean.ok) {
      for (const o of dean.offenders) {
        console.error('FACULTY LEAK DETECTED', o);
        details.push(`dean: id=${o.id} — ${o.reason}`);
      }
    }

    const dup = hasUniqueAnnouncementIds(announcements);
    if (!dup) details.push('duplicates: duplicate ids in announcement list');

    const pinOk = announcements.length === 0 || isPinnedNewestOrdering(announcements);
    if (!pinOk)
      details.push('pinOrder: list not ordered pinned → new → createdAt (server contract)');

    const next: DiagnosticReport = {
      apiFetch: !isLoading && error == null && apiResult.pass,
      visibility: vis.pass,
      deanRestriction: dean.ok,
      socket: socketConnected || announcements.length === 0,
      duplicates: dup,
      pinOrder: pinOk,
      read: readFlowOk,
      lightbox: lightboxOpened,
      errors: error == null || errorSimOk,
      details
    };
    setReport(next);
  }, [
    enabled,
    isLoading,
    error,
    announcements,
    visibilityUser,
    meVisibilityQuery.isSuccess,
    meVisibilityQuery.isError,
    meVisibilityQuery.error,
    userRole,
    deanPrimaryFacultyId,
    socketConnected,
    readFlowOk,
    lightboxOpened,
    errorSimOk
  ]);

  useEffect(() => {
    if (!enabled) {
      setReport(null);
      return;
    }
    const t = window.setTimeout(() => recomputeReport(), 400);
    return () => window.clearTimeout(t);
  }, [enabled, recomputeReport]);

  const snapshotUnreadBeforeRead = useCallback(() => {
    if (!enabled) return;
    unreadBeforeReadRef.current = unreadQuery.data?.unreadCount ?? null;
  }, [enabled, unreadQuery.data?.unreadCount]);

  const onReadDiagnostic = useCallback(
    (id: number) => {
      if (!enabled) return;
      console.log('MARKED AS READ:', id);
      void unreadQuery.refetch().then((r) => {
        const next = r.data?.unreadCount;
        const prev = unreadBeforeReadRef.current;
        if (prev != null && next != null && next < prev) {
          setReadFlowOk(true);
        }
      });
    },
    [enabled, unreadQuery]
  );

  const onLightboxDiagnostic = useCallback(() => {
    if (!enabled) return;
    console.log('LIGHTBOX OPENED');
    setLightboxOpened(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const g = globalThis as typeof globalThis & {
      __ANNOUNCEMENT_DIAG__?: {
        printReport: () => void;
        simulateApiFailure: (on: boolean) => void;
        simulateSocketDisconnect: () => void;
      };
    };
    g.__ANNOUNCEMENT_DIAG__ = {
      printReport: () => {
        if (report) printFinalReport(report);
        else console.warn('No diagnostic report yet — wait for data to load.');
      },
      simulateApiFailure: (on: boolean) => {
        setErrorSimOk(!on);
        setAnnouncementDiagnosticForceApiFailure(on);
        void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      },
      simulateSocketDisconnect: () => {
        getAnnouncementSocket()?.disconnect();
        console.warn('Socket disconnected (diagnostic). It will reconnect automatically.');
      }
    };
    return () => {
      delete g.__ANNOUNCEMENT_DIAG__;
      setAnnouncementDiagnosticForceApiFailure(false);
    };
  }, [enabled, queryClient, report]);

  useEffect(() => {
    if (!enabled || !report) return;
    const t = window.setTimeout(() => printFinalReport(report), 800);
    return () => window.clearTimeout(t);
  }, [enabled, report]);

  return {
    enabled,
    meVisibilityQuery,
    unreadCount: unreadQuery.data?.unreadCount ?? 0,
    unreadQuery,
    safeAnnouncements,
    socketDiagnostics,
    snapshotUnreadBeforeRead,
    onReadDiagnostic,
    onLightboxDiagnostic,
    report,
    isLoadingScope: meVisibilityQuery.isLoading
  };
}
