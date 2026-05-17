/**
 * @typedef {Object} AnnouncementTargetingInput
 * @property {number|string|null|undefined} [facultyId]
 * @property {number|string|null|undefined} [departmentId]
 * @property {number|string|null|undefined} [batchId]
 * @property {number|string|null|undefined} [sectionId]
 */

/**
 * @typedef {Object} SanitizedTargeting
 * @property {number|null} facultyId
 * @property {number|null} departmentId
 * @property {number|null} batchId
 * @property {number|null} sectionId
 */

/** @param {unknown} v @returns {number | null} */
function toNullableInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} v @returns {number | null} */
function toScopeFacultyId(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Hierarchy / missing-entity failure (HTTP 400). */
export class InvalidHierarchyError extends Error {
  constructor() {
    super("Invalid hierarchy relationship");
    this.name = "InvalidHierarchyError";
    this.status = 400;
  }
}

/** Dean (or scoped) faculty boundary violation (HTTP 403). */
export class OutsideFacultyError extends Error {
  constructor() {
    super("Outside allowed faculty");
    this.name = "OutsideFacultyError";
    this.status = 403;
  }
}

/**
 * Validates targeting using DB lookups only (never trusts ids blindly).
 * Intended for `createAnnouncement`, `updateAnnouncement`, etc.
 *
 * API shape: `validateHierarchy(prisma, targeting, facultyScope?)` — `prisma` is required
 * (runtime dependency; not in the logical `(targeting, facultyScope?)` tuple alone).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {AnnouncementTargetingInput} targeting
 * @param {string|number|null|undefined} [facultyScope] When set (e.g. dean’s faculty), rows must belong to this faculty or {@link OutsideFacultyError} is thrown.
 * @returns {Promise<SanitizedTargeting>}
 * @throws {InvalidHierarchyError} Missing row or inconsistent hierarchy (400)
 * @throws {OutsideFacultyError} Row exists but violates `facultyScope` (403)
 */
export async function validateHierarchy(prisma, targeting, facultyScope) {
  const facultyId = toNullableInt(targeting.facultyId);
  const departmentId = toNullableInt(targeting.departmentId);
  const batchId = toNullableInt(targeting.batchId);
  const sectionId = toNullableInt(targeting.sectionId);

  const scopeFacultyId = toScopeFacultyId(facultyScope);

  if (departmentId != null) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, facultyId: true },
    });
    if (!department) {
      throw new InvalidHierarchyError();
    }
    if (scopeFacultyId != null && department.facultyId !== scopeFacultyId) {
      throw new OutsideFacultyError();
    }
    if (facultyId != null && department.facultyId !== facultyId) {
      throw new InvalidHierarchyError();
    }
  }

  if (batchId != null) {
    const batch = await loadBatch(prisma, batchId);
    if (!batch) {
      throw new InvalidHierarchyError();
    }
    const dept = batch.program.department;
    if (scopeFacultyId != null && dept.facultyId !== scopeFacultyId) {
      throw new OutsideFacultyError();
    }
    if (facultyId != null && dept.facultyId !== facultyId) {
      throw new InvalidHierarchyError();
    }
    if (departmentId != null && dept.id !== departmentId) {
      throw new InvalidHierarchyError();
    }
  }

  if (sectionId != null) {
    const section = await loadSection(prisma, sectionId);
    if (!section) {
      throw new InvalidHierarchyError();
    }
    const dept = section.batch.program.department;
    if (scopeFacultyId != null && dept.facultyId !== scopeFacultyId) {
      throw new OutsideFacultyError();
    }
    if (facultyId != null && dept.facultyId !== facultyId) {
      throw new InvalidHierarchyError();
    }
    if (departmentId != null && dept.id !== departmentId) {
      throw new InvalidHierarchyError();
    }
    if (batchId != null && section.batchId !== batchId) {
      throw new InvalidHierarchyError();
    }
  }

  return { facultyId, departmentId, batchId, sectionId };
}

/** @param {import("@prisma/client").PrismaClient} prisma @param {number} batchId */
async function loadBatch(prisma, batchId) {
  return prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      program: {
        include: {
          department: { select: { id: true, facultyId: true } },
        },
      },
    },
  });
}

/** @param {import("@prisma/client").PrismaClient} prisma @param {number} sectionId */
async function loadSection(prisma, sectionId) {
  return prisma.batchSection.findUnique({
    where: { id: sectionId },
    include: {
      batch: {
        include: {
          program: {
            include: {
              department: { select: { id: true, facultyId: true } },
            },
          },
        },
      },
    },
  });
}
