import { prisma } from '../../db/prisma.js';

/** Roles AO may add to a group DM (besides self). */
export const AO_GROUP_MEMBER_ROLES = Object.freeze(['DEAN', 'OFFICE_STAFF']);

function isAoGroupMemberRole(roleName) {
  return AO_GROUP_MEMBER_ROLES.includes(String(roleName || '').toUpperCase());
}

/**
 * Academic Office group: creator is AO; others must be DEAN and/or OFFICE_STAFF.
 * @param {number} creatorUserId
 * @param {Iterable<number>} userIds — includes creator
 */
export async function assertAoDeanGroupMembers(creatorUserId, userIds, prismaClient = prisma) {
  const creatorId = Number(creatorUserId);
  const ids = [...new Set([...userIds].map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.includes(creatorId)) {
    return {
      ok: false,
      status: 400,
      message: 'Creator must be in the member list',
      code: 'DM_NO_MEMBERS',
    };
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
  const byId = new Map(users.map((u) => [u.id, String(u.role?.name || '').toUpperCase()]));
  if (byId.get(creatorId) !== 'ACADEMIC_OFFICE') {
    return {
      ok: false,
      status: 403,
      message: 'Only Academic Office can create these groups',
      code: 'DM_ROLE_FORBIDDEN',
    };
  }
  for (const id of ids) {
    if (id === creatorId) continue;
    if (!isAoGroupMemberRole(byId.get(id))) {
      return {
        ok: false,
        status: 403,
        message: 'Academic Office groups may only include deans and office staff',
        code: 'DM_ROLE_FORBIDDEN',
      };
    }
  }
  return { ok: true, users };
}

/** New members for an AO-owned group must be deans or office staff. */
export async function assertUsersAreDeans(userIds, prismaClient = prisma) {
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
  const bad = users.filter((u) => !isAoGroupMemberRole(u.role?.name));
  if (bad.length > 0) {
    return {
      ok: false,
      status: 403,
      message: 'Academic Office groups may only include deans and office staff',
      code: 'DM_ROLE_FORBIDDEN',
    };
  }
  return { ok: true, users };
}
