import { prisma } from '../../db/prisma.js';
import { monthSeries, offeringWhere, periodStart } from './helpers.js';

export async function loadReportScope({ facultyId, periodMonths = 6, filters = {} } = {}) {
  const monthsCount = Math.min(Math.max(Number(periodMonths) || 6, 3), 12);
  const since = periodStart(monthsCount);
  const months = monthSeries(monthsCount);
  const prevSince = new Date(since);
  prevSince.setMonth(prevSince.getMonth() - monthsCount);

  const faculty = await prisma.faculty.findUnique({
    where: { id: facultyId },
    select: { id: true, name: true, code: true },
  });

  const departments = await prisma.department.findMany({
    where: { facultyId },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
  const deptIds = departments.map((d) => d.id);

  const offerings = await prisma.courseOffering.findMany({
    where: offeringWhere(facultyId, filters),
    select: {
      id: true,
      courseId: true,
      teacherId: true,
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
        },
      },
      section: {
        select: {
          id: true,
          _count: { select: { studentRegistrations: true } },
        },
      },
    },
  });
  const offeringIds = offerings.map((o) => o.id);

  const seenCourseIds = new Set();
  const uniqueCourses = [];
  for (const o of offerings) {
    if (!seenCourseIds.has(o.courseId)) {
      seenCourseIds.add(o.courseId);
      uniqueCourses.push(o.course);
    }
  }

  return {
    facultyId,
    monthsCount,
    since,
    months,
    prevSince,
    faculty,
    departments,
    deptIds,
    offerings,
    offeringIds,
    uniqueCourses,
  };
}
