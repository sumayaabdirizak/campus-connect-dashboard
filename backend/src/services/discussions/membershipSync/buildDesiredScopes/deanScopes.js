import { DISCUSSION_CONTEXT_ROLES, DISCUSSION_SCOPE_TYPES } from "../../policy.js";
import { addDesiredRole, validAcademicId } from "../helpers.js";

export async function applyDeanScopes(tx, user, desiredByScope) {
  if (user.deanProfile?.facultyId && validAcademicId(user.deanProfile.facultyId)) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.FACULTY,
      user.deanProfile.facultyId,
      DISCUSSION_CONTEXT_ROLES.DEAN
    );
  }
  for (const faculty of user.facultiesAsDean ?? []) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.FACULTY,
      faculty.id,
      DISCUSSION_CONTEXT_ROLES.DEAN
    );
  }

  const deanFacultyIds = new Set();
  if (user.deanProfile?.facultyId && validAcademicId(user.deanProfile.facultyId)) {
    deanFacultyIds.add(user.deanProfile.facultyId);
  }
  for (const faculty of user.facultiesAsDean ?? []) {
    deanFacultyIds.add(faculty.id);
  }
  for (const fid of deanFacultyIds) {
    const departmentsInFaculty = await tx.department.findMany({
      where: { facultyId: fid },
      select: { id: true },
    });
    for (const d of departmentsInFaculty) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.DEPARTMENT,
        d.id,
        DISCUSSION_CONTEXT_ROLES.DEAN
      );
    }
    const batchesInFaculty = await tx.batch.findMany({
      where: { program: { department: { facultyId: fid } } },
      select: { id: true },
    });
    for (const b of batchesInFaculty) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.BATCH,
        b.id,
        DISCUSSION_CONTEXT_ROLES.DEAN
      );
    }
  }
}
