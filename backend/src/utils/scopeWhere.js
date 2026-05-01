import { getAuthFacultyId } from "./facultyAccess.js";

/**
 * Prisma `where` fragment: users tied to a faculty (students + lecturers with affiliation).
 * Used by Dean / Faculty Admin scoped list endpoints.
 * @param {number} facultyId
 * @param {Record<string, unknown>} [extra] merged with AND on top-level user filter
 */
export function whereUsersInFaculty(facultyId, extra = {}) {
  return {
    ...extra,
    OR: [
      { studentProfile: { facultyId } },
      { lecturerProfile: { faculties: { some: { facultyId } } } },
    ],
  };
}

/**
 * Batch sections whose batch belongs to a program in this faculty.
 * @param {number} facultyId
 */
export function whereBatchSectionsInFaculty(facultyId) {
  return {
    batch: {
      program: {
        department: { facultyId },
      },
    },
  };
}

/**
 * Returns faculty id for scoped roles; null for SUPER_ADMIN (caller should skip filter).
 * @param {import("express").Request["user"]} user
 */
export function scopeFacultyIdOrNull(user) {
  if (!user || user.role === "SUPER_ADMIN") return null;
  return getAuthFacultyId(user);
}
