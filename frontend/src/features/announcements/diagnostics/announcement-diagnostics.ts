import type { Announcement } from '../api/types';
import type { AnnouncementRealtimePayload } from '../api/socket-payloads';
import { sortAnnouncementsForDisplay } from '../api/use-announcement-socket';
import {
  canUserSeeAnnouncement,
  type AnnouncementVisibilityShape,
  type VisibleAnnouncementUser
} from './visibility-mirror';

export type MeVisibilityResponse = {
  visibilityUser: VisibleAnnouncementUser;
  deanPrimaryFacultyId: number | null;
};

export function announcementDtoToVisibilityShape(a: Announcement): AnnouncementVisibilityShape {
  const t = a.targeting ?? {};
  return {
    isActive: a.isActive !== false,
    targetType: a.targetType ?? 'ALL',
    facultyId: t.facultyId ?? null,
    departmentId: t.departmentId ?? null,
    batchId: t.batchId ?? null,
    sectionId: t.sectionId ?? null,
    targetRoles: a.targetRoles ?? []
  };
}

export function socketNewPayloadToVisibilityShape(
  payload: AnnouncementRealtimePayload & { isActive?: boolean; targetRoles?: string[] }
): AnnouncementVisibilityShape {
  const t = payload.targeting ?? {};
  return {
    isActive: payload.isActive !== false,
    targetType: payload.targetType,
    facultyId: t.facultyId ?? null,
    departmentId: t.departmentId ?? null,
    batchId: t.batchId ?? null,
    sectionId: t.sectionId ?? null,
    targetRoles: payload.targetRoles ?? []
  };
}

export function isPinnedNewestOrdering(list: Announcement[]): boolean {
  const sorted = sortAnnouncementsForDisplay([...list]);
  for (let i = 0; i < sorted.length; i++) {
    if (String(sorted[i]!.id) !== String(list[i]!.id)) return false;
  }
  return true;
}

export function checkDeanFacultyAlignment(
  role: string,
  deanPrimaryFacultyId: number | null,
  announcements: Announcement[]
): { ok: boolean; offenders: { id: unknown; reason: string }[] } {
  if (role !== 'DEAN' || deanPrimaryFacultyId == null) {
    return { ok: true, offenders: [] };
  }
  const offenders: { id: unknown; reason: string }[] = [];
  for (const a of announcements) {
    const shape = announcementDtoToVisibilityShape(a);
    if (
      shape.targetType === 'FACULTY' &&
      shape.facultyId != null &&
      shape.facultyId !== deanPrimaryFacultyId
    ) {
      offenders.push({
        id: a.id,
        reason: `FACULTY target facultyId=${shape.facultyId} !== deanPrimaryFacultyId=${deanPrimaryFacultyId}`
      });
    }
    if (
      shape.targetType === 'ALL' &&
      shape.facultyId != null &&
      shape.facultyId !== deanPrimaryFacultyId
    ) {
      offenders.push({
        id: a.id,
        reason: `ALL scoped to facultyId=${shape.facultyId} !== deanPrimaryFacultyId=${deanPrimaryFacultyId}`
      });
    }
  }
  return { ok: offenders.length === 0, offenders };
}

export function runApiFetchChecks(announcements: Announcement[]): {
  pass: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!Array.isArray(announcements)) {
    reasons.push('Response is not an array');
    return { pass: false, reasons };
  }
  for (const a of announcements) {
    if (a == null || a.id == null) reasons.push(`Null announcement row: ${JSON.stringify(a)}`);
    if (a?.isActive === false) reasons.push(`Inactive announcement in list: id=${a?.id}`);
  }
  if (!isPinnedNewestOrdering(announcements)) {
    reasons.push('Ordering is not pinned → new → createdAt (see sortAnnouncementsForDisplay)');
  }
  return { pass: reasons.length === 0, reasons };
}

export function runVisibilityChecks(
  visibilityUser: VisibleAnnouncementUser | null,
  announcements: Announcement[]
): { pass: boolean; leaks: { id: unknown; reason: string }[] } {
  if (!visibilityUser) {
    return { pass: false, leaks: [{ id: null, reason: 'visibilityUser not loaded' }] };
  }
  const leaks: { id: unknown; reason: string }[] = [];
  for (const a of announcements) {
    const visible = canUserSeeAnnouncement(visibilityUser, announcementDtoToVisibilityShape(a));
    if (!visible) {
      const reason = 'canUserSeeAnnouncement returned false for API row';
      leaks.push({ id: a.id, reason });
      console.error('VISIBILITY LEAK / MIRROR MISMATCH:', a.id, reason);
    } else {
      console.log('VISIBLE:', a.id);
    }
  }
  return { pass: leaks.length === 0, leaks };
}

export type DiagnosticReport = {
  apiFetch: boolean;
  visibility: boolean;
  deanRestriction: boolean;
  socket: boolean;
  duplicates: boolean;
  pinOrder: boolean;
  read: boolean;
  lightbox: boolean;
  errors: boolean;
  details: string[];
};

export type DiagnosticCheckKey = Exclude<keyof DiagnosticReport, 'details'>;

export function formatReportLine(key: DiagnosticCheckKey, pass: boolean, detail?: string): string {
  const label = `[${pass ? 'PASS' : 'FAIL'}] ${key}`;
  return detail ? `${label} — ${detail}` : label;
}

export function printFinalReport(report: DiagnosticReport) {
  const lines = [
    formatReportLine('apiFetch', report.apiFetch),
    formatReportLine('visibility', report.visibility),
    formatReportLine('deanRestriction', report.deanRestriction),
    formatReportLine('socket', report.socket),
    formatReportLine('duplicates', report.duplicates),
    formatReportLine('pinOrder', report.pinOrder),
    formatReportLine('read', report.read),
    formatReportLine('lightbox', report.lightbox),
    formatReportLine('errors', report.errors),
    '---',
    ...report.details
  ];
  console.log(
    '\n=== ANNOUNCEMENT DIAGNOSTIC REPORT ===\n' + lines.join('\n') + '\n=== END REPORT ===\n'
  );
}
