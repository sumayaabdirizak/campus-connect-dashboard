import { prisma } from "../db/prisma.js";

/** Primary faculty from JWT (Dean, Faculty Admin, or first affiliated faculty for teachers). */
export function getAuthFacultyId(user) {
  if (!user) return null;
  const v = user.facultyId ?? user.faculty_id;
  return v == null || v === "" ? null : Number(v);
}

/**
 * True if user may act on the given faculty (super admin always; dean/faculty admin must match).
 */
export function checkFacultyAccess(user, targetFacultyId) {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "FACULTY_ADMIN" || user.role === "DEAN") {
    const fid = getAuthFacultyId(user);
    return fid != null && fid === Number(targetFacultyId);
  }
  return false;
}

/**
 * Prisma where fragment for top-level `facultyId` (e.g. Faculty table).
 */
export function buildFacultyFilter(user, fieldName = "facultyId") {
  if (user.role === "SUPER_ADMIN") return {};
  if (user.role === "FACULTY_ADMIN" || user.role === "DEAN") {
    const id = getAuthFacultyId(user);
    return id == null ? { [fieldName]: -1 } : { [fieldName]: id };
  }
  return { [fieldName]: -1 };
}

/**
 * Nested filter: Program -> Department -> Faculty (Prisma uses camelCase `facultyId` on Department).
 */
export function buildNestedFacultyFilter(user) {
  if (user.role === "SUPER_ADMIN") return {};
  if (user.role === "FACULTY_ADMIN" || user.role === "DEAN") {
    const id = getAuthFacultyId(user);
    if (id == null) return { department: { facultyId: -1 } };
    return {
      department: {
        facultyId: id,
      },
    };
  }
  return { department: { facultyId: -1 } };
}

/**
 * Load faculty id for FACULTY_ADMIN JWT enrichment (login/refresh).
 */
export async function getFacultyIdForFacultyAdminUser(userId) {
  const row = await prisma.facultyAdminProfile.findUnique({
    where: { user_id: userId },
    select: { faculty_id: true },
  });
  return row?.faculty_id ?? null;
}
