/**
 * Prisma `where` fragment: users tied to a faculty (students, lecturers by affiliation or
 * home department, deans, faculty admins, and the user set as Faculty.dean).
 * Used by Dean / Faculty Admin scoped list endpoints.
 * @param {number} facultyId
 * @param {Record<string, unknown>} [extra] merged with AND on top-level user filter
 */
export function whereUsersInFaculty(facultyId, extra = {}) {
  const fid = Number(facultyId);
  return {
    ...extra,
    OR: [
      { studentProfile: { facultyId: fid } },
      {
        lecturerProfile: {
          faculties: { some: { facultyId: fid } },
        },
      },
      {
        lecturerProfile: {
          department: { facultyId: fid },
        },
      },
      { deanProfile: { facultyId: fid } },
      { facultyAdminProfile: { faculty_id: fid } },
      { facultiesAsDean: { some: { id: fid } } },
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
