import type {
  AnnouncementRealtimePayload,
  AnnouncementUpdatedPayload,
} from './socket-payloads';

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

export function getAnnouncementSocketDiagnosticsRef() {
  return announcementSocketDiagnosticsRef;
}

export type { AnnouncementSocketDiagnostics as AnnouncementSocketDiagnosticsType };
