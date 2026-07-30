import { prisma } from '../../db/prisma.js';

/** Classic 1:1 DMs — dean / teacher / student (pairwise scope elsewhere). */
export const DIRECT_DM_ROLE_NAMES = Object.freeze(['DEAN', 'TEACHER', 'STUDENT']);

/** Office Staff may start 1:1 DMs (scope from desk: university vs faculty). */
export const OFFICE_STAFF_DIRECT_DM_ROLE = 'OFFICE_STAFF';

/** Academic Office may start 1:1 DMs with deans (university-wide). */
export const ACADEMIC_OFFICE_DIRECT_DM_ROLE = 'ACADEMIC_OFFICE';

/** Group DMs may *include* these roles as members. */
export const GROUP_DM_ROLE_NAMES = Object.freeze(['DEAN', 'TEACHER', 'STUDENT']);

/** Who may *create* a group DM. */
export const GROUP_DM_CREATOR_ROLE_NAMES = Object.freeze([
  'STUDENT',
  'ACADEMIC_OFFICE',
  'DEAN',
]);

/** AO dean / office-staff groups: other members (kept for docs; enforced in assertAoDeanGroupMembers). */
export const AO_GROUP_DM_MEMBER_ROLE_NAMES = Object.freeze(['DEAN', 'OFFICE_STAFF']);

export function isDirectDmRoleName(roleName) {
  return DIRECT_DM_ROLE_NAMES.includes(String(roleName || '').toUpperCase());
}

export function isOfficeStaffDmRoleName(roleName) {
  return String(roleName || '').toUpperCase() === OFFICE_STAFF_DIRECT_DM_ROLE;
}

export function isAcademicOfficeDmRoleName(roleName) {
  return String(roleName || '').toUpperCase() === ACADEMIC_OFFICE_DIRECT_DM_ROLE;
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

/** Caller may use 1:1 DMs (dean/teacher/student or office staff). */
export async function assertUserCanUseDms(userId, prismaClient = prisma) {
  const row = await loadDmUserRole(userId, prismaClient);
  if (!row) {
    return { ok: false, status: 404, message: 'User not found', code: 'DM_USER_NOT_FOUND' };
  }
  if (
    !isDirectDmRoleName(row.roleName) &&
    !isOfficeStaffDmRoleName(row.roleName) &&
    !isAcademicOfficeDmRoleName(row.roleName)
  ) {
    return {
      ok: false,
      status: 403,
      message: 'Only deans, teachers, students, office staff, and Academic Office can use direct messages',
      code: 'DM_ROLE_FORBIDDEN',
    };
  }
  return { ok: true, user: row };
}

/** Caller may create group DMs / load group candidates. */
export async function assertUserCanUseGroupDms(userId, prismaClient = prisma) {
  const row = await loadDmUserRole(userId, prismaClient);
  if (!row) {
    return { ok: false, status: 404, message: 'User not found', code: 'DM_USER_NOT_FOUND' };
  }
  if (!isGroupDmCreatorRoleName(row.roleName)) {
    return {
      ok: false,
      status: 403,
      message: 'Only students, deans, or Academic Office can start group messages',
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
 * Complementary 1:1 targets by actor role.
 * @param {string} actorRole
 * @returns {readonly string[]}
 */
export function directDmTargetRolesFor(actorRole) {
  const r = String(actorRole || '').toUpperCase();
  if (r === 'TEACHER') return Object.freeze(['DEAN', 'STUDENT']);
  if (r === 'STUDENT') return Object.freeze(['TEACHER']);
  if (r === 'DEAN') {
    return Object.freeze(['TEACHER', 'STUDENT', 'OFFICE_STAFF', ACADEMIC_OFFICE_DIRECT_DM_ROLE]);
  }
  if (r === OFFICE_STAFF_DIRECT_DM_ROLE) {
    return Object.freeze(['DEAN', 'TEACHER', 'STUDENT']);
  }
  if (r === ACADEMIC_OFFICE_DIRECT_DM_ROLE) {
    return Object.freeze(['DEAN']);
  }
  return Object.freeze([]);
}
