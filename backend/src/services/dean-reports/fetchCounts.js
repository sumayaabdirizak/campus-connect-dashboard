import { prisma } from '../../db/prisma.js';
import { safe } from './helpers.js';

export async function fetchReportCounts({ facultyId, deptIds, offeringIds, since, prevSince }) {
  const [
    totalStudents,
    totalInstructors,
    totalCourses,
    activeStudents,
    totalSubmissions,
    onTimeSubmissions,
    inactiveStudents,
  ] = await Promise.all([
    safe(() => prisma.studentProfile.count({ where: { facultyId } }), 0),
    safe(
      () =>
        prisma.user.count({
          where: {
            role: { name: 'TEACHER' },
            lecturerProfile: { faculties: { some: { facultyId } } },
          },
        }),
      0
    ),
    safe(
      () =>
        prisma.course.count({
          where: { departmentId: { in: deptIds.length ? deptIds : [-1] } },
        }),
      0
    ),
    safe(() => prisma.studentProfile.count({ where: { facultyId } }), 0),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: offeringIds } } },
            })
          : 0,
      0
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.count({
              where: {
                assignment: { courseOfferingId: { in: offeringIds } },
                is_late: false,
              },
            })
          : 0,
      0
    ),
    safe(
      () =>
        prisma.user.count({
          where: {
            status: { in: ['INACTIVE', 'SUSPENDED'] },
            studentProfile: { facultyId },
          },
        }),
      0
    ),
  ]);

  return {
    totalStudents,
    totalInstructors,
    totalCourses,
    activeStudents,
    totalSubmissions,
    onTimeSubmissions,
    inactiveStudents,
  };
}
