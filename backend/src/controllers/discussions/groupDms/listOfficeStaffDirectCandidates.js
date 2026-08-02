import { listUniversityRoleCandidates } from './listUniversityRoleCandidates.js';
import { enrichCandidateDepartment } from './enrichCandidateDepartment.js';
import {
  listFacultyServerIdsForFaculties,
  resolveOfficeStaffDmScope,
} from '../../../services/discussions/officeStaffDmScope.js';

/**
 * Office Staff 1:1 candidates: university desk → university-wide;
 * faculty Dean's Office desk → that faculty's servers only.
 *
 * @returns {Promise<{ results: object[], dmScope: 'university' | 'faculty' | 'none' }>}
 */
export async function listOfficeStaffDirectCandidates(
  userId,
  q,
  allowedRoles,
  prismaClient,
  userSelect
) {
  const scope = await resolveOfficeStaffDmScope(userId, prismaClient);
  if (scope.kind === 'none') return { results: [], dmScope: 'none' };

  if (scope.kind === 'university') {
    const raw = await listUniversityRoleCandidates(
      userId,
      q,
      allowedRoles,
      prismaClient,
      userSelect
    );
    return {
      results: raw.map((u) => enrichCandidateDepartment(u, new Map())),
      dmScope: 'university',
    };
  }

  const facultyServerIds = await listFacultyServerIdsForFaculties(
    scope.facultyIds,
    prismaClient
  );
  if (facultyServerIds.length === 0) {
    return { results: [], dmScope: 'faculty' };
  }

  const needle = String(q ?? '')
    .trim()
    .slice(0, 80);

  const memberRows = await prismaClient.discussionGroupMembership.findMany({
    where: {
      groupId: { in: facultyServerIds },
      leftAt: null,
      isActive: true,
      userId: { not: Number(userId) },
      user: {
        status: 'ACTIVE',
        role: { name: { in: [...allowedRoles] } },
        ...(needle
          ? {
              OR: [
                { full_name: { contains: needle, mode: 'insensitive' } },
                { email: { contains: needle, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    },
    select: {
      userId: true,
      user: { select: userSelect },
    },
    take: 400,
    orderBy: { joinedAt: 'desc' },
  });

  const seen = new Set();
  const raw = [];
  for (const row of memberRows) {
    const uid = Number(row.userId);
    if (seen.has(uid) || !row.user) continue;
    seen.add(uid);
    raw.push(row.user);
    if (raw.length >= 250) break;
  }
  if (raw.length === 0) return { results: [], dmScope: 'faculty' };

  const studentDeptIds = [
    ...new Set(
      raw
        .map((u) => u.studentProfile?.departmentId)
        .filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
        .map(Number)
    ),
  ];
  const deptRows =
    studentDeptIds.length > 0
      ? await prismaClient.department.findMany({
          where: { id: { in: studentDeptIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
  const deptById = new Map(deptRows.map((d) => [d.id, d]));
  return {
    results: raw.map((u) => enrichCandidateDepartment(u, deptById)),
    dmScope: 'faculty',
  };
}
