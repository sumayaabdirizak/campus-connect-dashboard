import { prisma } from '../../db/prisma.js';
import { assertAllOnDeanFacultyOffice } from './deanOfficeStaffDm.js';

/** Roles a Dean may add to a faculty group DM (besides self). */
export const DEAN_GROUP_MEMBER_ROLES = Object.freeze([
  'TEACHER',
  'STUDENT',
  'LECTURER',
  'OFFICE_STAFF',
]);

function isDeanGroupMemberRole(roleName) {
  const r = String(roleName || '').toUpperCase();
  return DEAN_GROUP_MEMBER_ROLES.includes(r);
}

/**
 * Dean group: creator is DEAN; others = teachers, students, or faculty-desk office staff.
 * @param {number} creatorUserId
 * @param {Iterable<number>} userIds — includes creator
 */
export async function assertDeanFacultyGroupMembers(
  creatorUserId,
  userIds,
  prismaClient = prisma
) {
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
  if (byId.get(creatorId) !== 'DEAN') {
    return {
      ok: false,
      status: 403,
      message: 'Only a dean can create these groups',
      code: 'DM_ROLE_FORBIDDEN',
    };
  }

  const officeStaffIds = [];
  for (const id of ids) {
    if (id === creatorId) continue;
    const role = byId.get(id);
    if (!isDeanGroupMemberRole(role)) {
      return {
        ok: false,
        status: 403,
        message: 'Dean groups may only include teachers, students, and office staff',
        code: 'DM_ROLE_FORBIDDEN',
      };
    }
    if (role === 'OFFICE_STAFF') officeStaffIds.push(id);
  }

  if (officeStaffIds.length > 0) {
    const desk = await assertAllOnDeanFacultyOffice(creatorId, officeStaffIds, prismaClient);
    if (!desk.ok) return desk;
  }

  return { ok: true, users };
}

/** New members for a dean-owned group. */
export async function assertUsersAreDeanGroupMembers(
  userIds,
  prismaClient = prisma,
  deanUserId = null
) {
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
  const bad = users.filter((u) => !isDeanGroupMemberRole(u.role?.name));
  if (bad.length > 0) {
    return {
      ok: false,
      status: 403,
      message: 'Dean groups may only include teachers, students, and office staff',
      code: 'DM_ROLE_FORBIDDEN',
    };
  }
  const officeStaffIds = users
    .filter((u) => String(u.role?.name || '').toUpperCase() === 'OFFICE_STAFF')
    .map((u) => u.id);
  if (officeStaffIds.length > 0 && deanUserId != null) {
    const desk = await assertAllOnDeanFacultyOffice(deanUserId, officeStaffIds, prismaClient);
    if (!desk.ok) return desk;
  }
  return { ok: true, users };
}
