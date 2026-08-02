import { prisma } from "../../../db/prisma.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { renumberSemestersGloballyIfNeeded } from "../../../features/academic/semesterSequence.js";
import {
  ensureActiveAcademicYears,
  ACTIVE_ACADEMIC_YEAR_WINDOW,
  peekNextSemesterSequences,
} from "../../../features/academic/ensureSemesterCount.js";
import { resetToCleanTwelveSemesters } from "../../../features/academic/resetSemesters.js";

export const getNextSemesterNumbers = async (_req, res) => {
  try {
    const sequences = await peekNextSemesterSequences(2);
    const total = await prisma.semester.count();
    const yearCount = await prisma.academicYear.count();
    res.json({
      message: "Next semester numbers",
      nextSequences: sequences,
      totalSemesters: total,
      totalAcademicYears: yearCount,
      activeYearWindow: ACTIVE_ACADEMIC_YEAR_WINDOW,
    });
  } catch (err) {
    respondInternalError(res, "Failed to peek next semesters", err);
  }
};

export const ensureSixAcademicYears = async (_req, res) => {
  try {
    await renumberSemestersGloballyIfNeeded();
    const result = await ensureActiveAcademicYears(ACTIVE_ACADEMIC_YEAR_WINDOW);
    res.json({
      message: `Ensured ${ACTIVE_ACADEMIC_YEAR_WINDOW} active academic years (2 semesters each).`,
      ...result,
    });
  } catch (err) {
    respondInternalError(res, "Failed to ensure active academic years", err);
  }
};

export const resetSemestersCatalog = async (_req, res) => {
  try {
    const result = await resetToCleanTwelveSemesters();
    res.json({
      message: `Reset complete: ${result.totalSemesters} clean semesters (#1–#${result.totalSemesters}).`,
      ...result,
    });
  } catch (err) {
    respondInternalError(res, "Failed to reset semesters", err);
  }
};
