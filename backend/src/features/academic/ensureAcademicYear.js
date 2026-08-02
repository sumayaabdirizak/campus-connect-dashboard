import { prisma } from "../../db/prisma.js";
import {
  buildDefaultSemesterRows,
  getCurrentAcademicYearBounds,
} from "./academicCalendar.js";
import { getNextSemesterSequence } from "./semesterSequence.js";

/**
 * Ensures the academic year for `forDate` exists with default semesters.
 * New semesters get the next global sequence numbers (… N, N+1).
 */
export async function ensureAcademicYearForDate(forDate = new Date()) {
  const bounds = getCurrentAcademicYearBounds(forDate);
  const existing = await prisma.academicYear.findUnique({
    where: { name: bounds.name },
    include: { semesters: { orderBy: { sequence: "asc" } } },
  });
  if (existing) return { year: existing, created: false };

  const year = await prisma.academicYear.create({
    data: {
      name: bounds.name,
      start_date: bounds.startDate,
      end_date: bounds.endDate,
    },
  });

  const [startSequence] = await getNextSemesterSequence(2);
  const rows = buildDefaultSemesterRows(bounds, startSequence).map((row) => ({
    ...row,
    academicYearId: year.id,
  }));
  await prisma.semester.createMany({ data: rows });

  const withSemesters = await prisma.academicYear.findUnique({
    where: { id: year.id },
    include: { semesters: { orderBy: { sequence: "asc" } } },
  });

  return { year: withSemesters, created: true };
}
