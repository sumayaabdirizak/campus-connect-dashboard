import type { Announcement } from '../api/types';
import {
  checkDeanFacultyAlignment,
  isPinnedNewestOrdering,
  runApiFetchChecks,
  runVisibilityChecks,
  type DiagnosticReport,
} from './announcement-diagnostics';

export function hasUniqueAnnouncementIds(list: Announcement[]): boolean {
  const ids = new Set(list.map((a) => String(a.id)));
  return ids.size === list.length;
}

export function buildDiagnosticReport(args: {
  announcements: Announcement[];
  isLoading: boolean;
  error: Error | null;
  visibilityUser: Parameters<typeof runVisibilityChecks>[0] | null;
  meVisibilitySuccess: boolean;
  meVisibilityError: Error | null;
  userRole: string | undefined;
  deanPrimaryFacultyId: number | null;
  socketConnected: boolean;
  readFlowOk: boolean;
  lightboxOpened: boolean;
  errorSimOk: boolean;
}): DiagnosticReport {
  const {
    announcements,
    isLoading,
    error,
    visibilityUser,
    meVisibilitySuccess,
    meVisibilityError,
    userRole,
    deanPrimaryFacultyId,
    socketConnected,
    readFlowOk,
    lightboxOpened,
    errorSimOk,
  } = args;

  const details: string[] = [];
  const apiResult = runApiFetchChecks(announcements);
  if (!apiResult.pass) details.push(...apiResult.reasons.map((r) => `apiFetch: ${r}`));

  let vis: { pass: boolean; leaks: { id: unknown; reason: string }[] };
  if (meVisibilityError) {
    const msg = meVisibilityError.message ?? 'me-visibility failed';
    details.push(`me-visibility: ${msg}`);
    vis = { pass: false, leaks: [{ id: null, reason: msg }] };
  } else if (meVisibilitySuccess && visibilityUser) {
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
    userRole === 'DEAN' && meVisibilitySuccess
      ? checkDeanFacultyAlignment(userRole, deanPrimaryFacultyId, announcements)
      : { ok: true, offenders: [] as { id: unknown; reason: string }[] };

  if (!dean.ok) {
    for (const o of dean.offenders) {
      details.push(`dean: id=${o.id} — ${o.reason}`);
    }
  }

  const dup = hasUniqueAnnouncementIds(announcements);
  if (!dup) details.push('duplicates: duplicate ids in announcement list');

  const pinOk = announcements.length === 0 || isPinnedNewestOrdering(announcements);
  if (!pinOk) details.push('pinOrder: list not ordered pinned → new → createdAt (server contract)');

  return {
    apiFetch: !isLoading && error == null && apiResult.pass,
    visibility: vis.pass,
    deanRestriction: dean.ok,
    socket: socketConnected || announcements.length === 0,
    duplicates: dup,
    pinOrder: pinOk,
    read: readFlowOk,
    lightbox: lightboxOpened,
    errors: error == null || errorSimOk,
    details,
  };
}
