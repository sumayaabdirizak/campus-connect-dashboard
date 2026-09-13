import { prisma } from '../../../db/prisma.js';
import {
  parsePeriodMonths,
  monthSeries,
  periodStart,
  offeringWhere,
} from '../analytics-helpers.js';
import {
  isAllTimePeriod,
  isSemesterPeriod,
  resolveActiveSemesterWindow,
} from '../../academic/resolveActiveSemesterWindow.js';

function startOfDayIso(raw) {
  const d = new Date(`${String(raw).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDayIso(raw) {
  const d = new Date(`${String(raw).slice(0, 10)}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** @param {{ facultyId?: number|null, periodMonths?: number|string, period?: string, from?: string|null, to?: string|null }} args */
export async function buildPhaseA1Context(args = {}) {
  const scopedFacultyId =
    args.facultyId != null && Number.isFinite(Number(args.facultyId))
      ? Number(args.facultyId)
      : null;

  const periodRaw = args.period ?? args.periodMonths;
  const useCustom = String(periodRaw ?? '').trim().toLowerCase() === 'custom';
  let monthsCount;
  let since;
  let months;
  let periodLabel;

  if (isSemesterPeriod(periodRaw)) {
    const win = await resolveActiveSemesterWindow({
      facultyId: scopedFacultyId ?? undefined,
    });
    monthsCount = win.monthsCount;
    since = win.since;
    months = monthSeries(monthsCount);
    periodLabel = win.label;
  } else if (useCustom) {
    const win = await resolveActiveSemesterWindow({
      facultyId: scopedFacultyId ?? undefined,
    });
    const minSince = win.since;
    const maxUntil = win.untilClamped;
    since = args.from ? startOfDayIso(args.from) : minSince;
    if (!since || since < minSince) since = minSince;
    if (since > maxUntil) since = minSince;
    let untilSafe = args.to ? endOfDayIso(args.to) : maxUntil;
    if (!untilSafe || untilSafe > maxUntil) untilSafe = maxUntil;
    if (since > untilSafe) untilSafe = maxUntil;
    monthsCount = Math.max(
      1,
      Math.min(
        24,
        (untilSafe.getFullYear() - since.getFullYear()) * 12 +
          (untilSafe.getMonth() - since.getMonth()) +
          1
      )
    );
    months = monthSeries(monthsCount);
    periodLabel = `${toIso(since)} → ${toIso(untilSafe)}`;
  } else if (isAllTimePeriod(periodRaw)) {
    monthsCount = 24;
    since = periodStart(120);
    months = monthSeries(12);
    periodLabel = 'All time';
  } else {
    monthsCount = parsePeriodMonths(`${args.periodMonths ?? 6}m`);
    since = periodStart(monthsCount);
    months = monthSeries(monthsCount);
    periodLabel = `Last ${monthsCount} months`;
  }

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
    periodLabel,
    facultyMeta,
    offerings,
    offeringIds,
    uniqueCourses,
    announcementWhere,
  };
}
