import type { Announcement } from '../api/types';

/** Matches UI / URL `role` filter against announcement `targetRoles` (handles LECTURER vs TEACHER). */
export function announcementMatchesAudienceRole(
  announcement: Pick<Announcement, 'targetRoles'>,
  audienceRole: string
): boolean {
  if (!audienceRole || audienceRole === 'ALL') return true;
  const roles = (announcement.targetRoles ?? []).map((r) => String(r).toUpperCase());
  if (audienceRole === 'TEACHER') {
    return roles.includes('TEACHER') || roles.includes('LECTURER');
  }
  return roles.includes(audienceRole);
}
