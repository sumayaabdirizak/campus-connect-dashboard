import { prisma } from '../../db/prisma.js';

/**
 * Active OFFICE_STAFF on the Dean's Office desk for this dean (excludes dean).
 * @param {number} deanUserId
 * @param {string} [q]
 * @param {object} userSelect
 * @param {import('@prisma/client').PrismaClient} [prismaClient]
 */
export async function listFacultyDeanOfficeStaffCandidates(
  deanUserId,
  q,
  userSelect,
  prismaClient = prisma
) {
  const dean = await prismaClient.deanProfile.findUnique({
    where: { userId: Number(deanUserId) },
    select: { facultyId: true },
  });
  if (!dean?.facultyId) return [];

  const office = await prismaClient.supportOffice.findFirst({
    where: { facultyId: dean.facultyId, isActive: true },
    select: { id: true },
  });
  if (!office) return [];

  const needle = String(q ?? '')
    .trim()
    .slice(0, 80);

  const staffRows = await prismaClient.supportOfficeStaff.findMany({
    where: {
      officeId: office.id,
      userId: { not: Number(deanUserId) },
      user: {
        status: 'ACTIVE',
        role: { name: 'OFFICE_STAFF' },
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
    select: { user: { select: userSelect } },
    take: 250,
  });

  return staffRows.map((r) => r.user).filter(Boolean);
}

/**
 * Target must be OFFICE_STAFF on the dean's faculty Dean's Office.
 */
export async function assertTargetOnDeanFacultyOffice(
  deanUserId,
  targetUserId,
  prismaClient = prisma
) {
  const dean = await prismaClient.deanProfile.findUnique({
    where: { userId: Number(deanUserId) },
    select: { facultyId: true },
  });
  if (!dean?.facultyId) {
    return {
      ok: false,
      status: 403,
      message: 'Dean profile not found',
      code: 'DM_NO_DEAN_PROFILE',
    };
  }

  const office = await prismaClient.supportOffice.findFirst({
    where: { facultyId: dean.facultyId, isActive: true },
    select: { id: true },
  });
  if (!office) {
    return {
      ok: false,
      status: 403,
      message: "No Dean's Office desk for your faculty",
      code: 'DM_NO_FACULTY_OFFICE',
    };
  }

  const staff = await prismaClient.supportOfficeStaff.findUnique({
    where: {
      officeId_userId: { officeId: office.id, userId: Number(targetUserId) },
    },
    select: { userId: true },
  });
  if (!staff) {
    return {
      ok: false,
      status: 403,
      message: "You can only message office staff on your faculty Dean's Office",
      code: 'DM_NOT_FACULTY_OFFICE_STAFF',
    };
  }
  return { ok: true, officeId: office.id, facultyId: dean.facultyId };
}

/**
 * Every OFFICE_STAFF id must be on the dean's faculty desk; others use role checks elsewhere.
 * @param {number} deanUserId
 * @param {Iterable<number>} officeStaffUserIds
 */
export async function assertAllOnDeanFacultyOffice(
  deanUserId,
  officeStaffUserIds,
  prismaClient = prisma
) {
  const ids = [
    ...new Set(
      [...officeStaffUserIds].map(Number).filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (ids.length === 0) return { ok: true };

  for (const tid of ids) {
    const gate = await assertTargetOnDeanFacultyOffice(deanUserId, tid, prismaClient);
    if (!gate.ok) return gate;
  }
  return { ok: true };
}
