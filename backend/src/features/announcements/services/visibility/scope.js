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

/** @param {VisibleAnnouncementUser} user @returns {AnnouncementScope} */
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

/** @param {unknown} err */
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

/** @param {string} role */
export function buildTargetRolesWhere(role) {
  const r = String(role ?? "").toUpperCase();
  return { targetRoles: { has: r } };
}

/** @param {number} userId */
export function buildStatusVisibilityWhere(userId) {
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

/** @param {number} userId */
export function buildLegacyPublishedWhere(userId) {
  const now = new Date();
  return {
    OR: [
      { createdById: userId },
      { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
    ],
  };
}
