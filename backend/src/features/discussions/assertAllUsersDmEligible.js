import { prisma } from '../../db/prisma.js';
import { isGroupDmRoleName } from './groupDmEligibility.js';

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
