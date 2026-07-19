'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { setAnnouncementDiagnosticForceApiFailure } from '../api/service';
import type { DiagnosticReport } from './announcement-diagnostics';
import { printFinalReport } from './announcement-diagnostics';
import { getAnnouncementSocket } from '../api/use-announcement-socket';

export function useAnnouncementDiagnosticsGlobal(
  enabled: boolean,
  report: DiagnosticReport | null,
  onErrorSimChange: (ok: boolean) => void
) {
  const queryClient = useQueryClient();

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
        onErrorSimChange(!on);
        setAnnouncementDiagnosticForceApiFailure(on);
        void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      },
      simulateSocketDisconnect: () => {
        getAnnouncementSocket()?.disconnect();
        console.warn('Socket disconnected (diagnostic). It will reconnect automatically.');
      },
    };
    return () => {
      delete g.__ANNOUNCEMENT_DIAG__;
      setAnnouncementDiagnosticForceApiFailure(false);
    };
  }, [enabled, queryClient, report, onErrorSimChange]);

  useEffect(() => {
    if (!enabled || !report) return;
    const t = window.setTimeout(() => printFinalReport(report), 800);
    return () => window.clearTimeout(t);
  }, [enabled, report]);
}
