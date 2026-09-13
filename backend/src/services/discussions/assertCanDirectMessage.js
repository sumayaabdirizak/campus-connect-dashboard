import { prisma } from '../../db/prisma.js';
import {
  assertUserCanUseDms,
  directDmTargetRolesFor,
  listActiveFacultyServerIds,
  loadDmUserRole,
} from './groupDmEligibility.js';
import { assertStudentTeacherCourseLink } from './studentTeacherDm.js';

function directDmTargetForbiddenMessage(actorRole) {
  if (actorRole === 'TEACHER') {
    return 'Teachers can only message the faculty dean or their students';
  }
  if (actorRole === 'STUDENT') {
    return 'Students can only message their course teachers';
  }
  if (actorRole === 'DEAN') {
    return 'Deans can only message teachers or students in their faculty';
  }
  return 'You cannot message that user';
}

function isStudentTeacherPair(aRole, bRole) {
  const set = new Set([String(aRole).toUpperCase(), String(bRole).toUpperCase()]);
  return set.has('STUDENT') && set.has('TEACHER');
}

/** Dean↔teacher/student: shared faculty server. */
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
