import {
  validateHierarchy,
  InvalidHierarchyError,
  OutsideFacultyError,
} from "../../../../utils/validateHierarchy.js";

/**
 * @param {{ scopeType: string; scopeId: number }[]} targets
 * @param {import("@prisma/client").PrismaClient} prismaClient
 * @param {string|number|undefined|null} facultyScope
 */
export async function validateExtraTargets(prismaClient, targets, facultyScope) {
  for (const t of targets) {
    const st = String(t.scopeType).toUpperCase();
    const sid = Number(t.scopeId);
    if (!Number.isFinite(sid)) {
      return { ok: false, status: 400, message: "Invalid target scopeId" };
    }
    /** @type {Record<string, number | null>} */
    const targeting = {
      facultyId: null,
      departmentId: null,
      batchId: null,
      sectionId: null,
    };
    if (st === "FACULTY") targeting.facultyId = sid;
    else if (st === "DEPARTMENT") targeting.departmentId = sid;
    else if (st === "BATCH") targeting.batchId = sid;
    else if (st === "SECTION") targeting.sectionId = sid;
    else {
      return { ok: false, status: 400, message: "Invalid target scopeType" };
    }
    try {
      await validateHierarchy(prismaClient, targeting, facultyScope);
    } catch (err) {
      if (err instanceof InvalidHierarchyError || err instanceof OutsideFacultyError) {
        return { ok: false, status: err.status, message: err.message };
      }
      throw err;
    }
  }
  return { ok: true };
}
