import { isCrossFacultyAdmin } from '../../../../shared/roles.js';

/** Positive faculty ids from the JWT (primary + lecturer affiliations). */
export function viewerFacultyIds(req) {
  const ids = [];
  const primary = Number(req.user?.facultyId);
  if (Number.isFinite(primary) && primary > 0) ids.push(primary);
  for (const raw of req.user?.facultyIds ?? []) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) ids.push(n);
  }
  return [...new Set(ids)];
}

/**
 * Discovery visibility for clubs:
 * - Cross-faculty admins: no extra filter (see all APPROVED).
 * - Everyone else: UNIVERSITY/CROSS + FACULTY clubs in their faculty(ies).
 * @returns {Record<string, unknown>}
 */
export function viewerClubDiscoveryWhere(req) {
  if (isCrossFacultyAdmin(req.user?.role)) return {};

  const ids = viewerFacultyIds(req);
  return {
    OR: [
      { scopeKind: { in: ['UNIVERSITY', 'CROSS'] } },
      ...(ids.length > 0
        ? [{ scopeKind: 'FACULTY', facultyId: { in: ids } }]
        : []),
    ],
  };
}

/** Whether the viewer may join a faculty-scoped club. */
export function canViewerJoinFacultyClub(req, club) {
  if (!club || club.scopeKind !== 'FACULTY') return true;
  if (isCrossFacultyAdmin(req.user?.role)) return true;
  const fid = Number(club.facultyId);
  if (!Number.isFinite(fid) || fid <= 0) return false;
  return viewerFacultyIds(req).includes(fid);
}
