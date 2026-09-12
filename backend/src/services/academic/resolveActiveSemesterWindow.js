import { prisma } from '../../db/prisma.js';
import {
  buildDefaultSemesterRows,
  getCurrentAcademicYearBounds,
  getSemesterInYear,
} from './academicCalendar.js';
import { resolveActiveAcademicTerm } from './resolveActiveAcademicTerm.js';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Inclusive calendar months between two dates (min 1). */
export function monthsBetween(since, until) {
  if (!since || !until) return 1;
  const a = new Date(since);
  const b = new Date(until);
  const months =
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
  return Math.max(1, Math.min(24, months));
}

/**
 * Active semester date window for reports (university AIS → local Semester rows).
 *
 * @param {{ facultyId?: number }} [opts]
 * @returns {Promise<{
 *   since: Date,
 *   until: Date,
 *   untilClamped: Date,
 *   semesterId: number | null,
 *   academicYearId: number | null,
 *   label: string,
 *   monthsCount: number,
 * }>}
 */
export async function resolveActiveSemesterWindow(opts = {}) {
  const facultyId =
    opts.facultyId != null && Number.isFinite(Number(opts.facultyId))
      ? Number(opts.facultyId)
      : undefined;

  const term = await resolveActiveAcademicTerm({
    includeDb: true,
    ...(facultyId != null ? { facultyId } : {}),
  });

  let since = null;
  let until = null;
  let label = 'Current semester';
  let semesterId = term.semesterId ?? null;
  let academicYearId = term.academicYearId ?? null;

  if (semesterId) {
    const sem = await prisma.semester.findUnique({
      where: { id: semesterId },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        academicYear: { select: { name: true } },
      },
    });
    if (sem?.start_date && sem?.end_date) {
      since = startOfDay(sem.start_date);
      until = endOfDay(sem.end_date);
      const yearName = sem.academicYear?.name ?? term.academicYearName ?? '';
      label = yearName ? `${sem.name} · ${yearName}` : sem.name;
    }
  }

  if (!since || !until) {
    const bounds = getCurrentAcademicYearBounds();
    const slot = Number(term.semesterNumberInYear) || getSemesterInYear();
    const rows = buildDefaultSemesterRows(bounds);
    const row = rows[Math.max(0, slot - 1)] ?? rows[0];
    since = startOfDay(row.start_date);
    until = endOfDay(row.end_date);
    label = `${row.name} · ${bounds.name}`;
  }

  const nowEnd = endOfDay(new Date());
  const untilClamped = until.getTime() > nowEnd.getTime() ? nowEnd : until;

  return {
    since,
    until,
    untilClamped,
    semesterId,
    academicYearId,
    label,
    monthsCount: monthsBetween(since, untilClamped),
  };
}

/** True when query period asks for the active university semester. */
export function isSemesterPeriod(raw) {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase();
  return t === 'semester' || t === 'current' || t === 'current_semester';
}

/** True when the report should include all history (no date window). */
export function isAllTimePeriod(raw) {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase();
  return t === 'all' || t === 'alltime' || t === 'all_time';
}
