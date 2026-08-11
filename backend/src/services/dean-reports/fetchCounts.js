import { prisma } from '../../db/prisma.js';
import { whereUsersInFaculty } from '../../utils/scopeWhere.js';
import { safe } from './helpers.js';

export async function fetchReportCounts({ facultyId, deptIds, offeringIds, since, prevSince }) {
  const studentWhere = {
    facultyId,
    ...(deptIds.length === 1 ? { departmentId: deptIds[0] } : {}),
  };

  const [
    totalStudents,
    totalInstructors,
    totalCourses,
    activeStudents,
    totalSubmissions,
    onTimeSubmissions,
    inactiveStudents,
    totalFacultyMembers,
  ] = await Promise.all([
    safe(() => prisma.studentProfile.count({ where: studentWhere }), 0),
    safe(
      () =>
        prisma.user.count({
          where: {
            role: { name: 'TEACHER' },
            lecturerProfile: {
              faculties: { some: { facultyId } },
              ...(deptIds.length === 1 ? { departmentId: deptIds[0] } : {}),
            },
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
    safe(() => prisma.studentProfile.count({ where: studentWhere }), 0),
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
                lateState: 'ON_TIME',
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
            studentProfile: studentWhere,
          },
        }),
      0
    ),
    safe(() => prisma.user.count({ where: whereUsersInFaculty(facultyId) }), 0),
  ]);

  return {
    totalStudents,
    totalInstructors,
    totalCourses,
    activeStudents,
    totalSubmissions,
    onTimeSubmissions,
    inactiveStudents,
    totalFacultyMembers,
  };
}
