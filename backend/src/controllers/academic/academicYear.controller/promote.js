import { prisma } from "../../../db/prisma.js";
import { respondInternalError } from "../../../utils/httpError.js";
import {
  buildAcademicYearBounds,
  buildDefaultSemesterRows,
  enrichBatchWithCohortSemester,
} from "../../../services/academic/academicCalendar.js";
import { parseAcademicYearStartYear } from "../../../services/academic/academicCalendarDefaults.js";
import { getNextSemesterSequence } from "../../../services/academic/semesterSequence.js";
import { graduateCompletedCohorts } from "../../../services/academic/graduateCompletedCohorts.js";

/** Promote: create next year + sync batch semester_number from cohort formula (capped by duration). */
export const promoteAcademicYear = async (req, res) => {
  try {
    const latestYear = await prisma.academicYear.findFirst({
      orderBy: { end_date: "desc" },
    });
    if (!latestYear) return res.status(400).json({ message: "No academic year found." });

    const thisStart = parseAcademicYearStartYear(latestYear.name);
    if (thisStart == null) {
      return res.status(400).json({ message: "Academic year name format must be 'YYYY/YYYY'." });
    }
    const nextStart = thisStart + 1;
    const bounds = buildAcademicYearBounds(nextStart);

    const already = await prisma.academicYear.findUnique({ where: { name: bounds.name } });
    if (already) {
      return res.status(409).json({ message: `Academic Year ${bounds.name} already exists.` });
    }

    const newYear = await prisma.academicYear.create({
      data: {
        name: bounds.name,
        start_date: bounds.startDate,
        end_date: bounds.endDate,
      },
    });

    const [startSequence] = await getNextSemesterSequence(2);
    const semesterRows = buildDefaultSemesterRows(bounds, startSequence).map((row) => ({
      ...row,
      academicYearId: newYear.id,
    }));
    await prisma.semester.createMany({ data: semesterRows });

    const batches = await prisma.batch.findMany({
      include: {
        program: {
          include: {
            department: {
              include: { faculty: { select: { defaultDurationYears: true } } },
            },
          },
        },
        academicYear: true,
      },
    });

    // Sync as-of start of new year semester 1 (September).
    const asOf = bounds.startDate;
    let batchesUpdated = 0;
    for (const batch of batches) {
      if (batch.status === "INACTIVE") continue;
      const enriched = enrichBatchWithCohortSemester(batch, asOf);
      if (batch.semester_number !== enriched.cohortSemester) {
        await prisma.batch.update({
          where: { id: batch.id },
          data: { semester_number: enriched.cohortSemester },
        });
        batchesUpdated += 1;
      }
    }

    const graduation = await graduateCompletedCohorts(asOf);

    return res.json({
      message: `Promoted to Academic Year ${bounds.name}, semesters created, batches synced.`,
      newYear,
      semesters: semesterRows.map((s) => ({
        name: s.name,
        start: s.start_date,
        end: s.end_date,
      })),
      batchesUpdated,
      batchesGraduated: graduation.batchesGraduated,
      studentsGraduated: graduation.studentsGraduated,
    });
  } catch (err) {
    respondInternalError(res, "Failed to promote academic year", err);
  }
};
