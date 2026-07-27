import { prisma } from '../../db/prisma.js';

/** 1:1 DMs — dean ↔ teacher only. */
export const DIRECT_DM_ROLE_NAMES = Object.freeze(['DEAN', 'TEACHER']);

/** Group DMs may *include* these roles as members. */
export const GROUP_DM_ROLE_NAMES = Object.freeze(['DEAN', 'TEACHER', 'STUDENT']);

/** Who may *create* a group DM (student peer groups). Teachers use 1:1 only. */
export const GROUP_DM_CREATOR_ROLE_NAMES = Object.freeze(['STUDENT']);

export function isDirectDmRoleName(roleName) {
  return DIRECT_DM_ROLE_NAMES.includes(String(roleName || '').toUpperCase());
}

export function isGroupDmRoleName(roleName) {
  return GROUP_DM_ROLE_NAMES.includes(String(roleName || '').toUpperCase());
}

export function isGroupDmCreatorRoleName(roleName) {
  return GROUP_DM_CREATOR_ROLE_NAMES.includes(String(roleName || '').toUpperCase());
}

/**
 * @param {number} userId
 * @returns {Promise<{ id: number, roleName: string } | null>}
 */
export async function loadDmUserRole(userId, prismaClient = prisma) {
  const user = await prismaClient.user.findFirst({
    where: { id: Number(userId), status: 'ACTIVE' },
    select: { id: true, role: { select: { name: true } } },
  });
  if (!user) return null;
  return { id: user.id, roleName: String(user.role?.name || '').toUpperCase() };
}

/** Caller may use 1:1 DMs (dean/teacher). */
export async function assertUserCanUseDms(userId, prismaClient = prisma) {
  const row = await loadDmUserRole(userId, prismaClient);
  if (!row) {
    return { ok: false, status: 404, message: 'User not found', code: 'DM_USER_NOT_FOUND' };
  }
  if (!isDirectDmRoleName(row.roleName)) {
    return {
      ok: false,
      status: 403,
      message: 'Only deans and teachers can use direct messages',
      code: 'DM_ROLE_FORBIDDEN',
    };
  }
  return { ok: true, user: row };
}

/** Caller may create group DMs / load group candidates (students only). */
export async function assertUserCanUseGroupDms(userId, prismaClient = prisma) {
  const row = await loadDmUserRole(userId, prismaClient);
  if (!row) {
    return { ok: false, status: 404, message: 'User not found', code: 'DM_USER_NOT_FOUND' };
  }
  if (!isGroupDmCreatorRoleName(row.roleName)) {
    return {
      ok: false,
      status: 403,
      message: 'Only students can start group messages',
      code: 'DM_ROLE_FORBIDDEN',
    };
  }
  return { ok: true, user: row };
}

/**
 * @param {number} userId
 * @returns {Promise<number[]>}
 */
export async function listActiveFacultyServerIds(userId, prismaClient = prisma) {
  const rows = await prismaClient.discussionGroupMembership.findMany({
    where: {
      userId: Number(userId),
      leftAt: null,
      isActive: true,
      group: { status: 'ACTIVE', kind: 'FACULTY_SERVER' },
    },
    select: { groupId: true },
  });
  return [...new Set(rows.map((r) => r.groupId))];
}

/**
 * 1:1 DM is dean ↔ teacher only (not teacher↔teacher, not dean↔dean).
 * @param {string} actorRole
 * @returns {readonly string[]}
 */
export function directDmTargetRolesFor(actorRole) {
  const r = String(actorRole || '').toUpperCase();
  if (r === 'TEACHER') return Object.freeze(['DEAN']);
  if (r === 'DEAN') return Object.freeze(['TEACHER']);
  return Object.freeze([]);
}

/**
 * Both users must be complementary (dean↔teacher) and share a faculty server.
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
    const msg =
      actor.user.roleName === 'TEACHER'
        ? 'Teachers can only message the faculty dean'
        : 'Deans can only message teachers in their faculty';
    return {
      ok: false,
      status: 403,
      message: msg,
      code: 'DM_TARGET_ROLE_FORBIDDEN',
    };
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

/**
 * Every id must be an active dean, teacher, or student (group DMs).
 * @param {Iterable<number>} userIds
 */
export async function assertAllUsersDmEligible(userIds, prismaClient = prisma) {
  const ids = [...new Set([...userIds].map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  if (ids.length === 0) {
    return { ok: false, status: 400, message: 'No members provided', code: 'DM_NO_MEMBERS' };
  }
  const users = await prismaClient.user.findMany({
    where: { id: { in: ids }, status: 'ACTIVE' },
    select: { id: true, role: { select: { name: true } } },
  });
  if (users.length !== ids.length) {
    return {
      ok: false,
      status: 400,
      message: 'One or more users are invalid or inactive',
      code: 'DM_INVALID_USERS',
    };
  }
  const bad = users.filter((u) => !isGroupDmRoleName(u.role?.name));
  if (bad.length > 0) {
    return {
      ok: false,
      status: 403,
      message: 'Group messages may only include deans, teachers, and students',
      code: 'DM_ROLE_FORBIDDEN',
    };
  }
  return { ok: true, users };
}
