import { prisma } from "../../db/prisma.js";
import {
  buildAcademicYearBounds,
  buildDefaultSemesterRows,
  getCurrentAcademicYearBounds,
} from "./academicCalendar.js";
import { getNextSemesterSequence } from "./semesterSequence.js";

/**
 * Always keep this many academic years in the active window.
 * Matches longest faculty duration (e.g. Medicine = 6 years).
 * Each year has 2 semesters → up to 12 semester rows as a side effect.
 */
export const ACTIVE_ACADEMIC_YEAR_WINDOW = 6;

async function ensureYearWithTwoSemesters(startYear) {
  const bounds = buildAcademicYearBounds(startYear);
  let year = await prisma.academicYear.findUnique({ where: { name: bounds.name } });
  let createdYear = false;

  if (!year) {
    year = await prisma.academicYear.create({
      data: {
        name: bounds.name,
        start_date: bounds.startDate,
        end_date: bounds.endDate,
      },
    });
    createdYear = true;
  }

  const existingSemCount = await prisma.semester.count({
    where: { academicYearId: year.id },
  });
  if (existingSemCount >= 2) {
    return { year, createdYear, semestersCreated: 0 };
  }

  const [startSequence] = await getNextSemesterSequence(2);
  const rows = buildDefaultSemesterRows(
    {
      ...bounds,
      startDate: year.start_date,
      endDate: year.end_date,
    },
    startSequence
  ).map((row) => ({ ...row, academicYearId: year.id }));
  await prisma.semester.createMany({ data: rows });

  return { year, createdYear, semestersCreated: rows.length };
}

/**
 * Ensures a rolling window of N academic years ending at the current year
 * (current − (N−1) … current). Each year always has exactly 2 semesters.
 */
export async function ensureActiveAcademicYears(windowSize = ACTIVE_ACADEMIC_YEAR_WINDOW) {
  const { startYear: currentStart } = getCurrentAcademicYearBounds(new Date());
  const firstStart = currentStart - (windowSize - 1);

  let yearsCreated = 0;
  let semestersCreated = 0;
  const yearNames = [];

  for (let y = firstStart; y <= currentStart; y += 1) {
    const result = await ensureYearWithTwoSemesters(y);
    if (result.createdYear) yearsCreated += 1;
    semestersCreated += result.semestersCreated;
    yearNames.push(result.year.name);
  }

  return {
    windowSize,
    activeYears: yearNames,
    yearsCreated,
    semestersCreated,
    totalSemesters: await prisma.semester.count(),
  };
}

export function isYearInActiveWindow(yearName, windowSize = ACTIVE_ACADEMIC_YEAR_WINDOW) {
  const start = Number(String(yearName).split("/")[0]);
  if (!Number.isFinite(start)) return false;
  const { startYear: currentStart } = getCurrentAcademicYearBounds(new Date());
  return start >= currentStart - (windowSize - 1) && start <= currentStart;
}

export async function peekNextSemesterSequences(count = 2) {
  return getNextSemesterSequence(count);
}

/** @deprecated use ensureActiveAcademicYears */
export async function ensureGlobalSemesterCount() {
  return ensureActiveAcademicYears(ACTIVE_ACADEMIC_YEAR_WINDOW);
}

export const GLOBAL_SEMESTER_TARGET = ACTIVE_ACADEMIC_YEAR_WINDOW * 2;
