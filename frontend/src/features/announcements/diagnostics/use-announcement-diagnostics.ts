'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@/lib/async-query';
import type { Announcement } from '../api/types';
import {
  getAnnouncementMeVisibility,
  getAnnouncementUnreadCount,
} from '../api/service';
import { buildDiagnosticReport } from './announcement-diagnostics-report';
import { isAnnouncementDiagnosticsEnabled } from './announcement-diagnostics-enabled';
import {
  useAnnouncementSocketDiagnosticsConfig,
  useAnnouncementVisibilityFilter,
} from './announcement-diagnostics-socket';
import { useAnnouncementDiagnosticsGlobal } from './use-announcement-diagnostics-global';
import { useAnnouncementSocketConnected } from './use-announcement-socket-connected';
import type { DiagnosticReport } from './announcement-diagnostics';

export { isAnnouncementDiagnosticsEnabled };

export function useAnnouncementDiagnostics(options: {
  enabled: boolean;
  announcements: Announcement[];
  isLoading: boolean;
  error: Error | null;
  userRole: string | undefined;
}) {
  const { enabled, announcements, isLoading, error, userRole } = options;
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [readFlowOk, setReadFlowOk] = useState(false);
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [errorSimOk, setErrorSimOk] = useState(false);
  const unreadBeforeReadRef = useRef<number | null>(null);

  const meVisibilityQuery = useQuery({
    queryKey: ['announcements', 'diagnostics', 'me-visibility'],
    queryFn: getAnnouncementMeVisibility,
    enabled,
    staleTime: 60_000,
  });

  const unreadQuery = useQuery({
    queryKey: ['announcements', 'unread-count'],
    queryFn: getAnnouncementUnreadCount,
    enabled,
    refetchInterval: enabled ? 20_000 : false,
  });

  const visibilityUser = meVisibilityQuery.data?.visibilityUser ?? null;
  const deanPrimaryFacultyId = meVisibilityQuery.data?.deanPrimaryFacultyId ?? null;
  const socketConnected = useAnnouncementSocketConnected(enabled);
  const { socketDiagnostics, setVisibilityUserRef } =
    useAnnouncementSocketDiagnosticsConfig(enabled);
  const safeAnnouncements = useAnnouncementVisibilityFilter(
    enabled,
    visibilityUser,
    announcements
  );

  useEffect(() => {
    setVisibilityUserRef(visibilityUser);
  }, [visibilityUser, setVisibilityUserRef]);

  const recomputeReport = useCallback(() => {
    if (!enabled) return;
    if (!isLoading && error == null) {
      console.log('ANNOUNCEMENTS LOADED:', announcements.length);
    }
    setReport(
      buildDiagnosticReport({
        announcements,
        isLoading,
        error,
        visibilityUser,
        meVisibilitySuccess: meVisibilityQuery.isSuccess,
        meVisibilityError: meVisibilityQuery.isError ? meVisibilityQuery.error : null,
        userRole,
        deanPrimaryFacultyId,
        socketConnected,
        readFlowOk,
        lightboxOpened,
        errorSimOk,
      })
    );
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
    errorSimOk,
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
        if (prev != null && next != null && next < prev) setReadFlowOk(true);
      });
    },
    [enabled, unreadQuery]
  );

  const onLightboxDiagnostic = useCallback(() => {
    if (!enabled) return;
    console.log('LIGHTBOX OPENED');
    setLightboxOpened(true);
  }, [enabled]);

  useAnnouncementDiagnosticsGlobal(enabled, report, setErrorSimOk);

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
    isLoadingScope: meVisibilityQuery.isLoading,
  };
}
