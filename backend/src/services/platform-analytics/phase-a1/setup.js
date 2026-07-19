import { prisma } from '../../../db/prisma.js';
import {
  parsePeriodMonths,
  monthSeries,
  periodStart,
  offeringWhere,
} from '../analytics-helpers.js';

/** @param {{ facultyId?: number|null, periodMonths?: number }} args */
export async function buildPhaseA1Context(args = {}) {
  const scopedFacultyId =
    args.facultyId != null && Number.isFinite(Number(args.facultyId)) ? Number(args.facultyId) : null;
  const monthsCount = parsePeriodMonths(`${args.periodMonths ?? 6}m`);
  const since = periodStart(monthsCount);
  const months = monthSeries(monthsCount);

  const facultyMeta = scopedFacultyId
    ? await prisma.faculty.findUnique({
        where: { id: scopedFacultyId },
        select: { id: true, name: true, code: true },
      })
    : null;

  const offerings = await prisma.courseOffering.findMany({
    where: offeringWhere(scopedFacultyId),
    select: {
      id: true,
      courseId: true,
      course: { select: { id: true, code: true, name: true } },
    },
  });
  const offeringIds = offerings.map((o) => o.id);

  const seenIds = new Set();
  const uniqueCourses = [];
  for (const o of offerings) {
    if (!seenIds.has(o.courseId)) {
      seenIds.add(o.courseId);
      uniqueCourses.push(o.course);
    }
  }

  const announcementWhere = scopedFacultyId
    ? {
        status: 'PUBLISHED',
        targets: { some: { scopeType: 'FACULTY', scopeId: scopedFacultyId } },
      }
    : { status: 'PUBLISHED' };

  return {
    scopedFacultyId,
    monthsCount,
    since,
    months,
    facultyMeta,
    offerings,
    offeringIds,
    uniqueCourses,
    announcementWhere,
  };
}
