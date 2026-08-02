import { normalizeAnnouncementScope } from "./scope.js";

/**
 * @param {import("./scope.js").VisibleAnnouncementUser} user
 * @param {import("@prisma/client").Announcement & { targets?: { scopeType: string; scopeId: number }[] }} announcement
 */
export function canUserSeeAnnouncement(user, announcement) {
  const scope = normalizeAnnouncementScope(user);
  if (!announcement?.isActive) return false;

  const now = Date.now();
  const isAuthor = Number(announcement.createdById) === Number(user.id);
  if (!isAuthor) {
    if (announcement.publishedAt && new Date(announcement.publishedAt).getTime() > now) return false;
    const st = String(announcement.status ?? "PUBLISHED");
    if (st === "DRAFT" || st === "EXPIRED" || st === "ARCHIVED") return false;
    if (st === "SCHEDULED" && announcement.publishedAt && new Date(announcement.publishedAt).getTime() > now) {
      return false;
    }
  }

  if (isAuthor) return true;

  const normalizedRoles = Array.isArray(announcement.targetRoles)
    ? announcement.targetRoles.map((r) => String(r).toUpperCase())
    : [];
  const currentRole = String(user.role).toUpperCase();
  if (!normalizedRoles.includes(currentRole)) return false;

  if (scope.isSuperAdmin) return true;

  const { facultyIds, departmentIds, batchIds, sectionIds } = scope;
  const role = String(user.role || "").toUpperCase();
  const facultyPublisher =
    role === "DEAN" || (role === "OFFICE_STAFF" && facultyIds.size > 0);

  const matchesTargets =
    Array.isArray(announcement.targets) &&
    announcement.targets.some((t) => {
      if (t.scopeType === "FACULTY" && facultyIds.has(t.scopeId)) return true;
      if (t.scopeType === "DEPARTMENT" && departmentIds.has(t.scopeId)) return true;
      if (t.scopeType === "BATCH" && batchIds.has(t.scopeId)) return true;
      if (t.scopeType === "SECTION" && sectionIds.has(t.scopeId)) return true;
      return false;
    });

  if (announcement.targetType === "ALL") {
    if (facultyPublisher) {
      if (announcement.facultyId == null) return true;
      const primaryFac = facultyIds.size ? Array.from(facultyIds)[0] : null;
      return primaryFac != null && announcement.facultyId === primaryFac;
    }
    return true;
  }

  if (announcement.facultyId && facultyIds.has(announcement.facultyId)) return true;
  if (announcement.departmentId && departmentIds.has(announcement.departmentId)) return true;
  if (announcement.batchId && batchIds.has(announcement.batchId)) return true;
  if (announcement.sectionId && sectionIds.has(announcement.sectionId)) return true;

  return matchesTargets;
}
