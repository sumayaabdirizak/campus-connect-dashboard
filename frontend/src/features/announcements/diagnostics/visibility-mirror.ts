/**
 * Mirrors backend/src/utils/announcement-visibility.js (normalizeAnnouncementScope + canUserSeeAnnouncement).
 * Keep in sync when server visibility rules change.
 */

export type VisibleAnnouncementUser = {
  id: number;
  role: string;
  facultyIds?: number[];
  departmentIds?: number[];
  batchIds?: number[];
  sectionIds?: number[];
  facultyId?: number;
  departmentId?: number;
  batchId?: number;
  sectionId?: number;
  isSuperAdmin?: boolean;
};

export type AnnouncementVisibilityShape = {
  isActive?: boolean;
  targetType?: string;
  facultyId?: number | null;
  departmentId?: number | null;
  batchId?: number | null;
  sectionId?: number | null;
  targetRoles?: string[];
};

function toSet(value: unknown): Set<number> {
  if (!value) return new Set();
  if (value instanceof Set) return value as Set<number>;
  if (Array.isArray(value)) return new Set(value.filter((v): v is number => Number.isInteger(v)));
  return new Set(Number.isInteger(value) ? [value as number] : []);
}

export function normalizeAnnouncementScope(user: VisibleAnnouncementUser) {
  return {
    facultyIds: toSet(user.facultyIds ?? user.facultyId),
    departmentIds: toSet(user.departmentIds ?? user.departmentId),
    batchIds: toSet(user.batchIds ?? user.batchId),
    sectionIds: toSet(user.sectionIds ?? user.sectionId),
    isSuperAdmin: user.role === 'SUPER_ADMIN' || user.isSuperAdmin === true
  };
}

export function canUserSeeAnnouncement(
  user: VisibleAnnouncementUser,
  announcement: AnnouncementVisibilityShape
): boolean {
  const scope = normalizeAnnouncementScope(user);
  if (!announcement || announcement.isActive === false) return false;

  const roles = announcement.targetRoles ?? [];
  const normalizedRoles = roles.map((r) => String(r).toUpperCase());
  if (!normalizedRoles.includes(String(user.role).toUpperCase())) {
    return false;
  }

  if (scope.isSuperAdmin) return true;

  const { facultyIds, departmentIds, batchIds, sectionIds } = scope;
  const isDean = String(user.role) === 'DEAN';

  if (announcement.targetType === 'ALL') {
    if (isDean) {
      const deanFac = facultyIds.size ? Array.from(facultyIds)[0] : null;
      return deanFac != null && announcement.facultyId === deanFac;
    }
    return true;
  }

  if (announcement.facultyId != null && facultyIds.has(announcement.facultyId)) return true;
  if (announcement.departmentId != null && departmentIds.has(announcement.departmentId))
    return true;
  if (announcement.batchId != null && batchIds.has(announcement.batchId)) return true;
  if (announcement.sectionId != null && sectionIds.has(announcement.sectionId)) return true;

  return false;
}
