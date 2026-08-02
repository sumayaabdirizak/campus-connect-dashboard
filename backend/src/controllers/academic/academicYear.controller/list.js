import { prisma } from "../../../db/prisma.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { namedListSuccess } from "../../../utils/apiEnvelope.js";
import { parsePaginationQuery } from "../../../utils/pagination.js";
import {
  getCurrentAcademicYearBounds,
  getSemesterInYear,
} from "../../../services/academic/academicCalendar.js";
import { ensureAcademicYearForDate } from "../../../services/academic/ensureAcademicYear.js";
import { renumberSemestersGloballyIfNeeded } from "../../../services/academic/semesterSequence.js";
import { graduateCompletedCohorts } from "../../../services/academic/graduateCompletedCohorts.js";
import {
  ensureActiveAcademicYears,
  ACTIVE_ACADEMIC_YEAR_WINDOW,
  isYearInActiveWindow,
} from "../../../services/academic/ensureSemesterCount.js";

export const getAllAcademicYears = async (req, res) => {
  try {
    await renumberSemestersGloballyIfNeeded();
    await ensureAcademicYearForDate(new Date());
    await ensureActiveAcademicYears(ACTIVE_ACADEMIC_YEAR_WINDOW);
    try {
      await graduateCompletedCohorts(new Date());
    } catch (gradErr) {
      console.error("graduateCompletedCohorts skipped on list", gradErr?.message);
    }

    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
    const [totalCount, years] = await Promise.all([
      prisma.academicYear.count(),
      prisma.academicYear.findMany({
        orderBy: { start_date: "desc" },
        include: { semesters: { orderBy: { sequence: "asc" } }, batches: true },
        skip,
        take: pageSize,
      }),
    ]);

    const slot = getSemesterInYear(new Date());
    const currentName = getCurrentAcademicYearBounds(new Date()).name;
    const enriched = years.map((year) => {
      const ordered = [...(year.semesters ?? [])].sort((a, b) => a.sequence - b.sequence);
      const inActiveWindow = isYearInActiveWindow(year.name);
      const active =
        year.name === currentName ? (ordered[slot - 1] ?? ordered[0] ?? null) : null;
      return {
        ...year,
        activeSemester: active,
        yearSlot: year.name === currentName ? slot : null,
        inActiveWindow,
      };
    });

    res.json(
      namedListSuccess({
        message: "Academic years fetched",
        name: "years",
        items: enriched,
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (err) {
    respondInternalError(res, "Failed to fetch academic years", err);
  }
};
