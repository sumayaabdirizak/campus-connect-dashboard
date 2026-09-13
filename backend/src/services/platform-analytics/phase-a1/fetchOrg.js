import { prisma } from '../../../db/prisma.js';
import { safe, offeringWhere } from '../analytics-helpers.js';

export async function fetchOrgMetrics({ scopedFacultyId, announcementWhere }) {
  const [
    platformFaculties,
    platformDepartments,
    platformPrograms,
    platformTeachers,
    platformOfferings,
    platformClubs,
    platformAnnouncements,
  ] = await Promise.all([
    scopedFacultyId ? Promise.resolve(1) : safe(() => prisma.faculty.count(), 0),
    scopedFacultyId
      ? safe(() => prisma.department.count({ where: { facultyId: scopedFacultyId } }), 0)
      : safe(() => prisma.department.count(), 0),
    scopedFacultyId
      ? safe(
          () =>
            prisma.program.count({
              where: { department: { facultyId: scopedFacultyId } },
            }),
          0
        )
      : safe(() => prisma.program.count(), 0),
    safe(
      () =>
        prisma.user.count({
          where: {
            role: { name: 'TEACHER' },
            ...(scopedFacultyId
              ? { lecturerProfile: { faculties: { some: { facultyId: scopedFacultyId } } } }
              : {}),
          },
        }),
      0
    ),
    safe(() => prisma.courseOffering.count({ where: offeringWhere(scopedFacultyId) }), 0),
    scopedFacultyId
      ? safe(() => prisma.club.count({ where: { facultyId: scopedFacultyId } }), 0)
      : safe(() => prisma.club.count(), 0),
    safe(() => prisma.announcement.count({ where: announcementWhere }), 0),
  ]);

  return {
    platformFaculties,
    platformDepartments,
    platformPrograms,
    platformTeachers,
    platformOfferings,
    platformClubs,
    platformAnnouncements,
  };
}
