import { prisma } from '../../db/prisma.js';

/**
 * Active section ids for a student's current registration(s).
 * @param {number} studentId
 * @param {import('@prisma/client').PrismaClient} [prismaClient]
 * @returns {Promise<number[]>}
 */
export async function listActiveStudentSectionIds(
  studentId,
  prismaClient = prisma
) {
  const regs = await prismaClient.studentRegistration.findMany({
    where: { studentId: Number(studentId), status: 'ACTIVE' },
    select: { batchSectionId: true },
  });
  return [
    ...new Set(
      regs
        .map((r) => Number(r.batchSectionId))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
}

/**
 * Teachers assigned to offerings in the student's section(s).
 * @param {number} studentId
 * @param {import('@prisma/client').PrismaClient} [prismaClient]
 * @returns {Promise<number[]>}
 */
export async function listTeacherIdsForStudent(
  studentId,
  prismaClient = prisma
) {
  const sectionIds = await listActiveStudentSectionIds(studentId, prismaClient);
  if (sectionIds.length === 0) return [];

  const rows = await prismaClient.courseOffering.findMany({
    where: {
      sectionId: { in: sectionIds },
      teacherId: { not: null },
    },
    select: { teacherId: true },
    distinct: ['teacherId'],
  });
  return rows
    .map((r) => Number(r.teacherId))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/**
 * Students in sections where this user teaches an offering.
 * @param {number} teacherId
 * @param {import('@prisma/client').PrismaClient} [prismaClient]
 * @returns {Promise<number[]>}
 */
export async function listStudentIdsForTeacher(
  teacherId,
  prismaClient = prisma
) {
  const offerings = await prismaClient.courseOffering.findMany({
    where: { teacherId: Number(teacherId) },
    select: { sectionId: true },
    distinct: ['sectionId'],
  });
  const sectionIds = [
    ...new Set(
      offerings
        .map((o) => Number(o.sectionId))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  if (sectionIds.length === 0) return [];

  const regs = await prismaClient.studentRegistration.findMany({
    where: {
      status: 'ACTIVE',
      batchSectionId: { in: sectionIds },
    },
    select: { studentId: true },
    distinct: ['studentId'],
  });
  return regs
    .map((r) => Number(r.studentId))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/**
 * True when one is the other's course teacher (offering on student's section).
 */
export async function assertStudentTeacherCourseLink(
  userAId,
  userBId,
  prismaClient = prisma
) {
  const a = Number(userAId);
  const b = Number(userBId);
  const teachersOfA = await listTeacherIdsForStudent(a, prismaClient);
  if (teachersOfA.includes(b)) return { ok: true };
  const teachersOfB = await listTeacherIdsForStudent(b, prismaClient);
  if (teachersOfB.includes(a)) return { ok: true };
  return {
    ok: false,
    status: 403,
    message: 'You can only message teachers of your current courses',
    code: 'DM_NO_COURSE_LINK',
  };
}
