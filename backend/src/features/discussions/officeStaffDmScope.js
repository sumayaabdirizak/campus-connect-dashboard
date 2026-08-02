import { prisma } from '../../db/prisma.js';

/**
 * Resolve DM reach for an OFFICE_STAFF user from their desk memberships.
 * - Any university desk (facultyId null) → university-wide
 * - Only faculty Dean's Office desk(s) → those faculties
 * - No desk → none
 *
 * @param {number} userId
 * @param {import('@prisma/client').PrismaClient} [prismaClient]
 * @returns {Promise<
 *   | { kind: 'university' }
 *   | { kind: 'faculty', facultyIds: number[] }
 *   | { kind: 'none' }
 * >}
 */
export async function resolveOfficeStaffDmScope(userId, prismaClient = prisma) {
  const rows = await prismaClient.supportOfficeStaff.findMany({
    where: {
      userId: Number(userId),
      office: { isActive: true },
    },
    select: { office: { select: { facultyId: true } } },
  });

  if (rows.length === 0) return { kind: 'none' };

  const facultyIds = [];
  for (const row of rows) {
    const fid = row.office?.facultyId;
    if (fid == null) return { kind: 'university' };
    facultyIds.push(Number(fid));
  }

  const unique = [...new Set(facultyIds.filter((n) => Number.isFinite(n) && n > 0))];
  if (unique.length === 0) return { kind: 'none' };
  return { kind: 'faculty', facultyIds: unique };
}

/**
 * Active faculty-server group ids for the given faculties.
 * @param {number[]} facultyIds
 * @param {import('@prisma/client').PrismaClient} [prismaClient]
 * @returns {Promise<number[]>}
 */
export async function listFacultyServerIdsForFaculties(
  facultyIds,
  prismaClient = prisma
) {
  const ids = [
    ...new Set(
      [...facultyIds].map(Number).filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (ids.length === 0) return [];

  const rows = await prismaClient.discussionGroup.findMany({
    where: {
      status: 'ACTIVE',
      kind: 'FACULTY_SERVER',
      scopeType: 'FACULTY',
      scopeId: { in: ids },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Target must belong to one of the staff's faculty servers.
 * @param {number[]} facultyIds
 * @param {number} targetUserId
 */
export async function assertTargetInFacultyIds(
  facultyIds,
  targetUserId,
  prismaClient = prisma
) {
  const serverIds = await listFacultyServerIdsForFaculties(facultyIds, prismaClient);
  if (serverIds.length === 0) {
    return {
      ok: false,
      status: 403,
      message: 'No faculty server found for your office desk',
      code: 'DM_NO_FACULTY_SERVER',
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
      message: 'You can only message people in your faculty',
      code: 'DM_NO_SHARED_FACULTY',
    };
  }
  return { ok: true, serverIds };
}
