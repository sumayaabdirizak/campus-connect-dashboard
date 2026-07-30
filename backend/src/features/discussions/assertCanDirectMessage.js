import { prisma } from '../../db/prisma.js';
import {
  assertUserCanUseDms,
  directDmTargetRolesFor,
  isOfficeStaffDmRoleName,
  listActiveFacultyServerIds,
  loadDmUserRole,
  OFFICE_STAFF_DIRECT_DM_ROLE,
} from './groupDmEligibility.js';
import { assertTargetOnDeanFacultyOffice } from './deanOfficeStaffDm.js';
import {
  assertTargetInFacultyIds,
  resolveOfficeStaffDmScope,
} from './officeStaffDmScope.js';
import { assertStudentTeacherCourseLink } from './studentTeacherDm.js';

function directDmTargetForbiddenMessage(actorRole) {
  if (actorRole === 'TEACHER') {
    return 'Teachers can only message the faculty dean or their students';
  }
  if (actorRole === 'STUDENT') {
    return 'Students can only message their course teachers';
  }
  if (actorRole === 'DEAN') {
    return 'Deans can only message teachers, students, or their office staff';
  }
  if (actorRole === OFFICE_STAFF_DIRECT_DM_ROLE) {
    return 'Office staff can only message deans, teachers, and students';
  }
  if (actorRole === 'ACADEMIC_OFFICE') {
    return 'Academic Office can only message deans';
  }
  return 'You cannot message that user';
}

function isStudentTeacherPair(aRole, bRole) {
  const set = new Set([String(aRole).toUpperCase(), String(bRole).toUpperCase()]);
  return set.has('STUDENT') && set.has('TEACHER');
}

/**
 * Dean↔teacher/student: shared faculty server.
 * Dean→office staff: same faculty Dean's Office desk.
 * Office Staff: university desk → university-wide; faculty desk → faculty only.
 */
export async function assertCanDirectMessage(actorUserId, targetUserId, prismaClient = prisma) {
  const actor = await assertUserCanUseDms(actorUserId, prismaClient);
  if (!actor.ok) return actor;

  if (Number(actorUserId) === Number(targetUserId)) {
    return {
      ok: false,
      status: 400,
      message: "You can't start a DM with yourself",
      code: 'DM_SELF',
    };
  }

  const target = await loadDmUserRole(targetUserId, prismaClient);
  if (!target) {
    return { ok: false, status: 404, message: 'User not found', code: 'DM_USER_NOT_FOUND' };
  }

  const allowedTargets = directDmTargetRolesFor(actor.user.roleName);
  if (!allowedTargets.includes(target.roleName)) {
    return {
      ok: false,
      status: 403,
      message: directDmTargetForbiddenMessage(actor.user.roleName),
      code: 'DM_TARGET_ROLE_FORBIDDEN',
    };
  }

  if (isOfficeStaffDmRoleName(actor.user.roleName)) {
    const scope = await resolveOfficeStaffDmScope(actorUserId, prismaClient);
    if (scope.kind === 'none') {
      return {
        ok: false,
        status: 403,
        message: 'You must be assigned to an office desk to send messages',
        code: 'DM_NO_OFFICE_DESK',
      };
    }
    if (scope.kind === 'university') {
      return { ok: true, actor: actor.user, target };
    }
    const facultyGate = await assertTargetInFacultyIds(
      scope.facultyIds,
      targetUserId,
      prismaClient
    );
    if (!facultyGate.ok) return facultyGate;
    return { ok: true, actor: actor.user, target };
  }

  // Dean → Office Staff on faculty desk (no faculty-server membership required).
  if (actor.user.roleName === 'DEAN' && target.roleName === 'OFFICE_STAFF') {
    const desk = await assertTargetOnDeanFacultyOffice(
      actorUserId,
      targetUserId,
      prismaClient
    );
    if (!desk.ok) return desk;
    return { ok: true, actor: actor.user, target };
  }

  // Academic Office ↔ Dean: university-wide, no faculty-server membership required.
  if (
    (actor.user.roleName === 'ACADEMIC_OFFICE' && target.roleName === 'DEAN') ||
    (actor.user.roleName === 'DEAN' && target.roleName === 'ACADEMIC_OFFICE')
  ) {
    return { ok: true, actor: actor.user, target };
  }

  // Student ↔ teacher: must share a course offering on the student's section.
  if (isStudentTeacherPair(actor.user.roleName, target.roleName)) {
    const link = await assertStudentTeacherCourseLink(
      actorUserId,
      targetUserId,
      prismaClient
    );
    if (!link.ok) return link;
    return { ok: true, actor: actor.user, target };
  }

  const serverIds = await listActiveFacultyServerIds(actorUserId, prismaClient);
  if (serverIds.length === 0) {
    return {
      ok: false,
      status: 403,
      message: 'You can only message people you share a faculty with',
      code: 'DM_NO_SHARED_FACULTY',
    };
  }

  const shares = await prismaClient.discussionGroupMembership.count({
    where: {
      groupId: { in: serverIds },
      userId: Number(targetUserId),
      leftAt: null,
      isActive: true,
    },
  });
  if (shares < 1) {
    return {
      ok: false,
      status: 403,
      message: 'You can only message people you share a faculty with',
      code: 'DM_NO_SHARED_FACULTY',
    };
  }

  return { ok: true, actor: actor.user, target };
}
