import { prisma } from '../../db/prisma.js';
import { monthSeries, offeringWhere, periodStart } from './helpers.js';
import {
  isAllTimePeriod,
  isSemesterPeriod,
  resolveActiveSemesterWindow,
} from '../academic/resolveActiveSemesterWindow.js';

function startOfDayIso(raw) {
  const d = new Date(`${String(raw).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDayIso(raw) {
  const d = new Date(`${String(raw).slice(0, 10)}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isCustomPeriod(raw) {
  return String(raw ?? '').trim().toLowerCase() === 'custom';
}

/**
 * @param {{
 *   facultyId: number;
 *   periodMonths?: number | string;
 *   period?: string;
 *   from?: string | null;
 *   to?: string | null;
 *   filters?: Record<string, string | number | null>;
 * }} opts
 */
export async function loadReportScope({
  facultyId,
  periodMonths = 6,
  period,
  from = null,
  to = null,
  filters = {},
} = {}) {
  const periodRaw = period ?? periodMonths;
  const useSemester = isSemesterPeriod(periodRaw);
  const useAllTime = isAllTimePeriod(periodRaw);
  const useCustom = isCustomPeriod(periodRaw);

  let monthsCount;
  let since;
  let months;
  let prevSince;
  let periodLabel;
  let scopedFilters = { ...filters };

  if (useSemester) {
    const win = await resolveActiveSemesterWindow({ facultyId });
    monthsCount = win.monthsCount;
    since = win.since;
    months = monthSeries(monthsCount);
    prevSince = new Date(since);
    prevSince.setMonth(prevSince.getMonth() - monthsCount);
    periodLabel = win.label;
    if (win.semesterId && !scopedFilters.semesterId) {
      scopedFilters.semesterId = win.semesterId;
    }
    if (win.academicYearId && !scopedFilters.academicYearId) {
      scopedFilters.academicYearId = win.academicYearId;
    }
  } else if (useCustom) {
    const win = await resolveActiveSemesterWindow({ facultyId });
    const minSince = win.since;
    const maxUntil = win.untilClamped;
    since = from ? startOfDayIso(from) : minSince;
    if (since && since < minSince) {
      const err = new Error(
        'Reports only cover the current semester. From date cannot be before the current semester start.'
      );
      err.status = 400;
      throw err;
    }
    if (!since) since = minSince;
    let untilSafe = to ? endOfDayIso(to) : maxUntil;
    if (untilSafe && untilSafe > maxUntil) {
      const err = new Error(
        'Reports only cover the current semester. To date cannot be after the current semester window.'
      );
      err.status = 400;
      throw err;
    }
    if (!untilSafe) untilSafe = maxUntil;
    if (since > untilSafe) {
      const err = new Error('From date must be on or before To date.');
      err.status = 400;
      throw err;
    }
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
    prevSince = new Date(since);
    prevSince.setMonth(prevSince.getMonth() - monthsCount);
    periodLabel = `${toIso(since)} → ${toIso(untilSafe)}`;
  } else if (useAllTime) {
    monthsCount = 24;
    since = periodStart(120);
    months = monthSeries(12);
    prevSince = periodStart(240);
    periodLabel = 'All time';
  } else {
    monthsCount = Math.min(Math.max(Number(periodMonths) || 6, 3), 12);
    since = periodStart(monthsCount);
    months = monthSeries(monthsCount);
    prevSince = new Date(since);
    prevSince.setMonth(prevSince.getMonth() - monthsCount);
    periodLabel = `Last ${monthsCount} months`;
  }

  const faculty = await prisma.faculty.findUnique({
    where: { id: facultyId },
    select: { id: true, name: true, code: true },
  });

  const departments = await prisma.department.findMany({
    where: { facultyId },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  const filterDeptId = scopedFilters.departmentId
    ? Number(scopedFilters.departmentId)
    : null;
  const deptIds = filterDeptId
    ? departments.filter((d) => d.id === filterDeptId).map((d) => d.id)
    : departments.map((d) => d.id);

  const offerings = await prisma.courseOffering.findMany({
    where: offeringWhere(facultyId, scopedFilters),
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

  // Active semester may have no offerings yet (sync still on prior term).
  // Fall back to the academic year so reports aren't empty.
  let resolvedOfferings = offerings;
  if (
    resolvedOfferings.length === 0 &&
    scopedFilters.semesterId &&
    scopedFilters.academicYearId
  ) {
    const { semesterId: _drop, ...yearFilters } = scopedFilters;
    resolvedOfferings = await prisma.courseOffering.findMany({
      where: offeringWhere(facultyId, yearFilters),
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
    if (resolvedOfferings.length > 0) {
      delete scopedFilters.semesterId;
      periodLabel = `${periodLabel} (year offerings)`;
    }
  }

  const offeringIds = resolvedOfferings.map((o) => o.id);

  const seenCourseIds = new Set();
  const uniqueCourses = [];
  for (const o of resolvedOfferings) {
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
    periodLabel,
    faculty,
    departments,
    deptIds,
    offerings: resolvedOfferings,
    offeringIds,
    uniqueCourses,
    filters: scopedFilters,
  };
}

function toIso(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
