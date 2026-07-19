import { DISCUSSION_CONTEXT_ROLES, DISCUSSION_SCOPE_TYPES } from "../../policy.js";
import { addDesiredRole, validAcademicId } from "../helpers.js";

export async function applyProfileScopes(tx, user, desiredByScope) {
  if (user.facultyAdminProfile?.faculty_id && validAcademicId(user.facultyAdminProfile.faculty_id)) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.FACULTY,
      user.facultyAdminProfile.faculty_id,
      DISCUSSION_CONTEXT_ROLES.ADMIN
    );
  }

  if (user.lecturerProfile?.departmentId && validAcademicId(user.lecturerProfile.departmentId)) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      user.lecturerProfile.departmentId,
      DISCUSSION_CONTEXT_ROLES.LECTURER
    );
  }

  if (user.studentProfile?.departmentId && validAcademicId(user.studentProfile.departmentId)) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      user.studentProfile.departmentId,
      DISCUSSION_CONTEXT_ROLES.STUDENT
    );
  }

  for (const registration of user.studentRegistrations ?? []) {
    const prog = registration.batchSection?.batch?.program;
    const deptIdFromReg = prog?.departmentId;
    const facIdFromReg = prog?.department?.facultyId;
    if (validAcademicId(facIdFromReg)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.FACULTY,
        facIdFromReg,
        DISCUSSION_CONTEXT_ROLES.STUDENT
      );
    }
    if (validAcademicId(deptIdFromReg)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.DEPARTMENT,
        deptIdFromReg,
        DISCUSSION_CONTEXT_ROLES.STUDENT
      );
    }
    const batchId = registration.batchSection?.batchId;
    if (validAcademicId(batchId)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.BATCH,
        batchId,
        DISCUSSION_CONTEXT_ROLES.STUDENT
      );
    }
    if (validAcademicId(registration.batchSectionId)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.SECTION,
        registration.batchSectionId,
        DISCUSSION_CONTEXT_ROLES.STUDENT
      );
    }
  }

  for (const assignment of user.teacherAssignings ?? []) {
    for (const offering of assignment.course?.offerings ?? []) {
      if (offering.section?.batchId && validAcademicId(offering.section.batchId)) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.BATCH,
          offering.section.batchId,
          DISCUSSION_CONTEXT_ROLES.LECTURER
        );
      }
      if (offering.sectionId && validAcademicId(offering.sectionId)) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.SECTION,
          offering.sectionId,
          DISCUSSION_CONTEXT_ROLES.LECTURER
        );
      }
    }
  }

  if (user.studentProfile?.facultyId && validAcademicId(user.studentProfile.facultyId)) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.FACULTY,
      user.studentProfile.facultyId,
      DISCUSSION_CONTEXT_ROLES.STUDENT
    );
  }

  if (user.lecturerProfile?.departmentId) {
    const deptRow = await tx.department.findUnique({
      where: { id: user.lecturerProfile.departmentId },
      select: { facultyId: true },
    });
    if (deptRow?.facultyId && validAcademicId(deptRow.facultyId)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.FACULTY,
        deptRow.facultyId,
        DISCUSSION_CONTEXT_ROLES.LECTURER
      );
    }
  }
  for (const lf of user.lecturerProfile?.faculties ?? []) {
    if (lf.facultyId && validAcademicId(lf.facultyId)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.FACULTY,
        lf.facultyId,
        DISCUSSION_CONTEXT_ROLES.LECTURER
      );
    }
  }
}
