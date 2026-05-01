/**
 * @typedef {Object} AnnouncementScope
 * @property {Set<number>} facultyIds
 * @property {Set<number>} departmentIds
 * @property {Set<number>} batchIds
 * @property {Set<number>} sectionIds
 * @property {boolean} isSuperAdmin
 */

/**
 * @typedef {Object} VisibleAnnouncementUser
 * @property {number} id
 * @property {string} role
 * @property {number[]=} facultyIds
 * @property {number[]=} departmentIds
 * @property {number[]=} batchIds
 * @property {number[]=} sectionIds
 * @property {number=} facultyId
 * @property {number=} departmentId
 * @property {number=} batchId
 * @property {number=} sectionId
 * @property {boolean=} isSuperAdmin
 */

/**
 * Normalize user scope so visibility checks can be reused across services.
 * @param {VisibleAnnouncementUser} user
 * @returns {AnnouncementScope}
 */
export function normalizeAnnouncementScope(user) {
  const toSet = (value) => {
    if (!value) return new Set();
    if (value instanceof Set) return value;
    if (Array.isArray(value)) return new Set(value.filter((v) => Number.isInteger(v)));
    return new Set(Number.isInteger(value) ? [value] : []);
  };

  return {
    facultyIds: toSet(user.facultyIds ?? user.facultyId),
    departmentIds: toSet(user.departmentIds ?? user.departmentId),
    batchIds: toSet(user.batchIds ?? user.batchId),
    sectionIds: toSet(user.sectionIds ?? user.sectionId),
    isSuperAdmin: user.role === "SUPER_ADMIN" || user.isSuperAdmin === true,
  };
}

/**
 * `targetRoles` filter: empty = all roles; otherwise caller's `role` must be listed.
 * @param {string} role
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput}
 */
function buildTargetRolesWhere(role) {
  const r = String(role ?? "").toUpperCase();
  return { targetRoles: { has: r } };
}

/**
 * Prisma `where` for hierarchy-based visibility + active + optional targetRoles.
 * Dean: never plain global ALL unless `facultyId` matches their faculty (strict faculty boundary).
 *
 * @param {VisibleAnnouncementUser} user
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput}
 */
export function buildVisibleAnnouncementsWhere(user) {
  const scope = normalizeAnnouncementScope(user);
  const base = {
    AND: [{ isActive: true }, { OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] }],
  };
  const roleClause = buildTargetRolesWhere(user.role);
  const creatorClause = { createdById: user.id };

  if (scope.isSuperAdmin) {
    return { AND: [base, { OR: [roleClause, creatorClause] }] };
  }

  const toArray = (set) => Array.from(set);
  const or = [];
  const isDean = String(user.role) === "DEAN";

  if (isDean) {
    const deanFacultyIds = toArray(scope.facultyIds);
    const deanFacultyId = deanFacultyIds[0];
    if (deanFacultyId != null) {
      or.push({
        AND: [{ targetType: "ALL" }, { facultyId: deanFacultyId }],
      });
    }
  } else {
    or.push({ targetType: "ALL" });
  }

  if (scope.facultyIds.size > 0) {
    or.push({ facultyId: { in: toArray(scope.facultyIds) } });
  }
  if (scope.departmentIds.size > 0) {
    or.push({ departmentId: { in: toArray(scope.departmentIds) } });
  }
  if (scope.batchIds.size > 0) {
    or.push({ batchId: { in: toArray(scope.batchIds) } });
  }
  if (scope.sectionIds.size > 0) {
    or.push({ sectionId: { in: toArray(scope.sectionIds) } });
  }

  return {
    AND: [base, { OR: [creatorClause, { AND: [{ OR: or }, roleClause] }] }],
  };
}

/** @deprecated Use {@link buildVisibleAnnouncementsWhere} */
export const buildAnnouncementVisibilityWhere = buildVisibleAnnouncementsWhere;

/**
 * Fetch visible announcements (backend-filtered only).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {VisibleAnnouncementUser} user Must include `id` and `role` for logs and targetRoles filter.
 * @param {Omit<import("@prisma/client").Prisma.AnnouncementFindManyArgs, "where" | "orderBy">} [queryArgs] include, select, take, skip, etc.
 * @returns {Promise<import("@prisma/client").Announcement[]>}
 */
export async function getVisibleAnnouncements(prisma, user, queryArgs = {}) {
  const { where: _dropWhere, orderBy: _dropOrder, internalSkipOrder, ...rest } = queryArgs ?? {};
  const where = buildVisibleAnnouncementsWhere(user);
  const result = await prisma.announcement.findMany({
    ...rest,
    where,
    ...(internalSkipOrder
      ? {}
      : { orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }] }),
  });

  const facultyLog = user.facultyIds?.[0] ?? user.facultyId ?? null;
  console.log("USER:", user.id, user.role);
  console.log("FACULTY:", facultyLog);
  console.log("VISIBLE COUNT:", result.length);

  return result;
}

/**
 * Unread visible announcements for this user (backend-filtered).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {VisibleAnnouncementUser} user
 */
export async function getUnreadCount(prisma, user) {
  return prisma.announcement.count({
    where: {
      AND: [
        buildVisibleAnnouncementsWhere(user),
        { reads: { none: { userId: user.id } } },
      ],
    },
  });
}

/**
 * Visibility predicate for one announcement (mirrors DB rules in JS).
 *
 * @param {VisibleAnnouncementUser} user
 * @param {import("@prisma/client").Announcement} announcement
 * @returns {boolean}
 */
export function canUserSeeAnnouncement(user, announcement) {
  const scope = normalizeAnnouncementScope(user);
  if (!announcement?.isActive) return false;
  if (announcement.publishedAt && new Date(announcement.publishedAt).getTime() > Date.now()) return false;
  if (Number(announcement.createdById) === Number(user.id)) return true;

  const normalizedRoles = Array.isArray(announcement.targetRoles)
    ? announcement.targetRoles.map((r) => String(r).toUpperCase())
    : [];
  const currentRole = String(user.role).toUpperCase();
  if (!normalizedRoles.includes(currentRole)) {
    return false;
  }

  if (scope.isSuperAdmin) return true;

  const { facultyIds, departmentIds, batchIds, sectionIds } = scope;
  const isDean = String(user.role) === "DEAN";

  if (announcement.targetType === "ALL") {
    if (isDean) {
      const deanFac = facultyIds.size ? Array.from(facultyIds)[0] : null;
      return deanFac != null && announcement.facultyId === deanFac;
    }
    return true;
  }

  if (announcement.facultyId && facultyIds.has(announcement.facultyId)) return true;
  if (announcement.departmentId && departmentIds.has(announcement.departmentId)) return true;
  if (announcement.batchId && batchIds.has(announcement.batchId)) return true;
  if (announcement.sectionId && sectionIds.has(announcement.sectionId)) return true;

  return false;
}
