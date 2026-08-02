/**
 * Load faculty / department / batch / section ids for announcement visibility and Socket.IO rooms.
 * Mirrors HTTP GET scope so REST filters and realtime rooms stay aligned.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} userId
 * @returns {Promise<{ userId: number, full_name: string, role: string, status: string, facultyIds: number[], departmentIds: number[], batchIds: number[], sectionIds: number[] } | null>}
 */
import { resolveOfficeStaffDmScope } from '../services/discussions/officeStaffDmScope.js';
import { expandFacultyAnnouncementTree } from './expandFacultyAnnouncementTree.js';

export async function loadUserAnnouncementScope(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      studentProfile: true,
      lecturerProfile: {
        include: {
          faculties: { select: { facultyId: true } },
        },
      },
      deanProfile: true,
      studentRegistrations: {
        include: {
          batchSection: {
            include: {
              batch: {
                include: {
                  program: { select: { departmentId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const roleName = String(user.role?.name || '').toUpperCase();

  if (roleName === 'DEAN' && user.deanProfile?.facultyId) {
    const tree = await expandFacultyAnnouncementTree(prisma, [user.deanProfile.facultyId]);
    return {
      userId: user.id,
      full_name: user.full_name,
      role: user.role.name,
      status: user.status,
      ...tree,
    };
  }

  // Faculty Dean's Office staff — same tree as dean (not university desks).
  if (roleName === 'OFFICE_STAFF') {
    const desk = await resolveOfficeStaffDmScope(userId, prisma);
    if (desk.kind === 'faculty') {
      const tree = await expandFacultyAnnouncementTree(prisma, desk.facultyIds);
      return {
        userId: user.id,
        full_name: user.full_name,
        role: user.role.name,
        status: user.status,
        ...tree,
      };
    }
  }

  const facultyIds = new Set();
  const departmentIds = new Set();
  const batchIds = new Set();
  const sectionIds = new Set();

  if (user.studentProfile?.facultyId) facultyIds.add(user.studentProfile.facultyId);
  if (user.studentProfile?.departmentId) departmentIds.add(user.studentProfile.departmentId);

  if (user.lecturerProfile?.departmentId) departmentIds.add(user.lecturerProfile.departmentId);
  for (const f of user.lecturerProfile?.faculties ?? []) {
    if (f.facultyId) facultyIds.add(f.facultyId);
  }

  if (user.deanProfile?.facultyId) facultyIds.add(user.deanProfile.facultyId);

  for (const registration of user.studentRegistrations ?? []) {
    if (registration.batchSectionId) sectionIds.add(registration.batchSectionId);
    const batch = registration.batchSection?.batch;
    if (batch?.id) batchIds.add(batch.id);
    if (batch?.program?.departmentId) departmentIds.add(batch.program.departmentId);
  }

  return {
    userId: user.id,
    full_name: user.full_name,
    role: user.role.name,
    status: user.status,
    facultyIds: Array.from(facultyIds),
    departmentIds: Array.from(departmentIds),
    batchIds: Array.from(batchIds),
    sectionIds: Array.from(sectionIds),
  };
}
