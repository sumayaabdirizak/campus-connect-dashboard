/**
 * Visibility rules for announcements: hierarchy, multi-target rows, status machine.
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
 * @param {string} role
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput}
 */
function buildTargetRolesWhere(role) {
  const r = String(role ?? "").toUpperCase();
  return { targetRoles: { has: r } };
}

/**
 * True when the DB is behind Prisma (missing `status`, `AnnouncementTarget`, `searchVector`, etc.).
 * @param {unknown} err
 */
export function isPrismaAnnouncementSchemaDriftError(err) {
  const msg = String(err?.message ?? err);
  const code = err && typeof err === "object" && "code" in err ? String(/** @type {{ code?: string }} */ (err).code) : "";
  if (code === "P2022" || code === "P2021") return true;
  return (
    /column .*(\bstatus\b|\bsearchVector\b|\bbodyMarkdown\b)/i.test(msg) ||
    /The column .* does not exist/i.test(msg) ||
    (/does not exist/i.test(msg) && /AnnouncementTarget|AnnouncementAudit|AnnouncementRead|WebPushSubscription/i.test(msg)) ||
    (/Unknown field|Unknown arg/i.test(msg) && /targets|status|searchVector|reads/i.test(msg))
  );
}

/**
 * Reader-visible statuses (non-authors): published / scheduled past publish time.
 * `expiresAt` controls a timed pin window only (not feed visibility).
 * Authors always see their own rows via `createdById` branch in main query.
 */
function buildStatusVisibilityWhere(userId) {
  const now = new Date();
  return {
    OR: [
      { createdById: userId },
      {
        AND: [
          { status: { in: ["PUBLISHED", "SCHEDULED"] } },
          { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
        ],
      },
    ],
  };
}

/**
 * @param {VisibleAnnouncementUser} user
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput}
 */
export function buildVisibleAnnouncementsWhere(user) {
  const scope = normalizeAnnouncementScope(user);
  const base = {
    AND: [{ isActive: true }, buildStatusVisibilityWhere(user.id)],
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

  const targetRowScopes = [];
  if (scope.facultyIds.size > 0) {
    targetRowScopes.push({ scopeType: "FACULTY", scopeId: { in: toArray(scope.facultyIds) } });
  }
  if (scope.departmentIds.size > 0) {
    targetRowScopes.push({ scopeType: "DEPARTMENT", scopeId: { in: toArray(scope.departmentIds) } });
  }
  if (scope.batchIds.size > 0) {
    targetRowScopes.push({ scopeType: "BATCH", scopeId: { in: toArray(scope.batchIds) } });
  }
  if (scope.sectionIds.size > 0) {
    targetRowScopes.push({ scopeType: "SECTION", scopeId: { in: toArray(scope.sectionIds) } });
  }
  if (targetRowScopes.length > 0) {
    or.push({
      targets: {
        some: {
          OR: targetRowScopes,
        },
      },
    });
  }

  return {
    AND: [base, { OR: [creatorClause, { AND: [{ OR: or }, roleClause] }] }],
  };
}

/**
 * Same scope rules as {@link buildVisibleAnnouncementsWhere}, but for DBs missing
 * `status`, `AnnouncementTarget`, etc.: no status filter, no `targets` relation in the query.
 * @param {VisibleAnnouncementUser} user
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput}
 */
export function buildVisibleAnnouncementsWhereLegacy(user) {
  const scope = normalizeAnnouncementScope(user);
  const now = new Date();
  const base = {
    AND: [
      { isActive: true },
      {
        OR: [
          { createdById: user.id },
          {
            OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
          },
        ],
      },
    ],
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
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {VisibleAnnouncementUser} user
 * @param {Omit<import("@prisma/client").Prisma.AnnouncementFindManyArgs, "where" | "orderBy">} [queryArgs]
 */
export async function getVisibleAnnouncements(prisma, user, queryArgs = {}) {
  const { where: _dropWhere, orderBy: _dropOrder, internalSkipOrder, ...rest } = queryArgs ?? {};
  const where = buildVisibleAnnouncementsWhere(user);
  try {
    return await prisma.announcement.findMany({
      ...rest,
      where,
      ...(internalSkipOrder
        ? {}
        : { orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }, { id: "desc" }] }),
    });
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    return prisma.announcement.findMany({
      ...rest,
      where: buildVisibleAnnouncementsWhereLegacy(user),
      ...(internalSkipOrder
        ? {}
        : { orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }, { id: "desc" }] }),
    });
  }
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {VisibleAnnouncementUser} user
 */
export async function getUnreadCount(prisma, user) {
  const whereFor = (w) => ({
    where: {
      AND: [w, { reads: { none: { userId: user.id } } }],
    },
  });
  const whereForExcludingDrafts = (w) => ({
    where: {
      AND: [w, { status: { not: "DRAFT" } }, { reads: { none: { userId: user.id } } }],
    },
  });
  try {
    return await prisma.announcement.count(whereForExcludingDrafts(buildVisibleAnnouncementsWhere(user)));
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    try {
      return await prisma.announcement.count(whereFor(buildVisibleAnnouncementsWhereLegacy(user)));
    } catch (legacyErr) {
      if (!isPrismaAnnouncementSchemaDriftError(legacyErr)) throw legacyErr;
      // Final safety fallback for partially migrated schemas: keep endpoint alive.
      return 0;
    }
  }
}

/**
 * @param {VisibleAnnouncementUser} user
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
  if (!normalizedRoles.includes(currentRole)) {
    return false;
  }

  if (scope.isSuperAdmin) return true;

  const { facultyIds, departmentIds, batchIds, sectionIds } = scope;
  const isDean = String(user.role) === "DEAN";

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

  if (matchesTargets) return true;

  return false;
}
