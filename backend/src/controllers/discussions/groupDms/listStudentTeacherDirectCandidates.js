import { listActiveFacultyServerIds } from '../../../services/discussions/groupDmEligibility.js';
import {
  listStudentIdsForTeacher,
  listTeacherIdsForStudent,
} from '../../../services/discussions/studentTeacherDm.js';
import { enrichCandidateDepartment } from './enrichCandidateDepartment.js';

/**
 * Student→teachers / teacher→students (+ faculty deans for teachers).
 */
export async function listStudentTeacherDirectCandidates(
  actorUserId,
  actorRole,
  q,
  prismaClient,
  userSelect
) {
  const role = String(actorRole || '').toUpperCase();
  const ids =
    role === 'STUDENT'
      ? await listTeacherIdsForStudent(actorUserId, prismaClient)
      : role === 'TEACHER'
        ? await listStudentIdsForTeacher(actorUserId, prismaClient)
        : [];

  const seen = new Set();
  const raw = [];

  if (ids.length > 0) {
    const people = await prismaClient.user.findMany({
      where: {
        id: { in: ids },
        status: 'ACTIVE',
        ...(q
          ? {
              OR: [
                { full_name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: userSelect,
      take: 250,
      orderBy: { full_name: 'asc' },
    });
    for (const u of people) {
      const uid = Number(u.id);
      if (seen.has(uid)) continue;
      seen.add(uid);
      raw.push(u);
    }
  }

  if (role === 'TEACHER') {
    const serverIds = await listActiveFacultyServerIds(actorUserId, prismaClient);
    if (serverIds.length > 0) {
      const deanRows = await prismaClient.discussionGroupMembership.findMany({
        where: {
          groupId: { in: serverIds },
          leftAt: null,
          isActive: true,
          userId: { not: Number(actorUserId) },
          user: {
            status: 'ACTIVE',
            role: { name: 'DEAN' },
            ...(q
              ? {
                  OR: [
                    { full_name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
        },
        select: { user: { select: userSelect } },
        take: 50,
      });
      for (const row of deanRows) {
        const uid = Number(row.user?.id);
        if (!uid || seen.has(uid) || !row.user) continue;
        seen.add(uid);
        raw.push(row.user);
      }
    }
  }

  if (raw.length === 0) return { results: [], dmScope: 'courses' };

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
    dmScope: 'courses',
  };
}
