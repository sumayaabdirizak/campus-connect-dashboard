import { prisma } from "../../../db/prisma.js";
import { respondInternalError } from "../../../utils/httpError.js";
import {
  buildAcademicYearBounds,
  buildDefaultSemesterRows,
} from "../../../services/academic/academicCalendar.js";
import { parseAcademicYearStartYear } from "../../../services/academic/academicCalendarDefaults.js";
import { getNextSemesterSequence } from "../../../services/academic/semesterSequence.js";

export const createAcademicYear = async (req, res) => {
  const { name, start_date, end_date } = req.body;
  try {
    const year = await prisma.academicYear.create({
      data: {
        name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      },
    });

    // Always auto-assign next global semester pair (#N, #N+1).
    const startYear = parseAcademicYearStartYear(name) ?? new Date(start_date).getFullYear();
    const bounds = {
      ...buildAcademicYearBounds(startYear),
      name,
      startDate: new Date(start_date),
      endDate: new Date(end_date),
    };
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

    res.status(201).json({
      message: "Academic year created with next global semesters",
      year: withSemesters,
      assignedSequences: rows.map((r) => r.sequence),
    });
  } catch (err) {
    if (err.code === "P2002") {
      res.status(409).json({ message: "Academic year name must be unique." });
    } else {
      respondInternalError(res, "Failed to create academic year", err);
    }
  }
};
