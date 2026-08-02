import {
  ACADEMIC_CALENDAR_DEFAULTS,
  buildAcademicYearName,
  lastDayOfMonth,
  maxSemestersForDuration,
  parseAcademicYearStartYear,
} from "./academicCalendarDefaults.js";

export function getCurrentAcademicYearBounds(forDate = new Date()) {
  const year = forDate.getFullYear();
  const month = forDate.getMonth() + 1;
  const { yearStartMonth } = ACADEMIC_CALENDAR_DEFAULTS;
  const startYear = month >= yearStartMonth ? year : year - 1;
  const endYear = startYear + 1;

  return {
    name: buildAcademicYearName(startYear),
    startYear,
    endYear,
    startDate: new Date(startYear, yearStartMonth - 1, ACADEMIC_CALENDAR_DEFAULTS.yearStartDay),
    endDate: new Date(
      endYear,
      ACADEMIC_CALENDAR_DEFAULTS.semester2EndMonth - 1,
      ACADEMIC_CALENDAR_DEFAULTS.semester2EndDay
    ),
  };
}

/** Semester 1: Sep–Feb. Semester 2: Mar–Aug. */
export function getSemesterInYear(forDate = new Date()) {
  const month = forDate.getMonth() + 1;
  const { yearStartMonth, semester2StartMonth } = ACADEMIC_CALENDAR_DEFAULTS;
  if (month >= yearStartMonth || month < semester2StartMonth) return 1;
  return 2;
}

export function computeCohortSemester(cohortStartYear, forDate = new Date()) {
  if (!Number.isFinite(cohortStartYear)) return 1;
  const current = getCurrentAcademicYearBounds(forDate);
  const yearsElapsed = Math.max(0, current.startYear - cohortStartYear);
  const semInYear = getSemesterInYear(forDate);
  return yearsElapsed * ACADEMIC_CALENDAR_DEFAULTS.semestersPerYear + semInYear;
}

export function buildDefaultSemesterRows(bounds, startSequence = 1) {
  const { endYear, startDate, endDate } = bounds;
  const { semester1EndMonth, semester2StartMonth } = ACADEMIC_CALENDAR_DEFAULTS;
  const semester1End = new Date(
    endYear,
    semester1EndMonth - 1,
    lastDayOfMonth(endYear, semester1EndMonth - 1)
  );
  const semester2Start = new Date(endYear, semester2StartMonth - 1, 1);

  return [
    {
      name: `Semester ${startSequence}`,
      sequence: startSequence,
      start_date: startDate,
      end_date: semester1End,
    },
    {
      name: `Semester ${startSequence + 1}`,
      sequence: startSequence + 1,
      start_date: semester2Start,
      end_date: endDate,
    },
  ];
}

export function cohortStartYearFromBatch(batch) {
  return parseAcademicYearStartYear(batch.academicYear?.name) ?? batch.academic_year;
}

/**
 * Enrich batch with cohort semester capped by program/faculty duration.
 * 4-year program → max 8; 6-year → max 12.
 */
export function enrichBatchWithCohortSemester(batch, forDate = new Date()) {
  const cohortStartYear = cohortStartYearFromBatch(batch);
  const durationYears =
    batch.program?.durationYears ??
    batch.program?.department?.faculty?.defaultDurationYears ??
    ACADEMIC_CALENDAR_DEFAULTS.defaultDurationYears;
  const maxSemesters = maxSemestersForDuration(durationYears);
  const raw = computeCohortSemester(cohortStartYear, forDate);
  const cohortSemester = Math.min(raw, maxSemesters);

  return {
    ...batch,
    cohortSemester,
    maxSemesters,
    durationYears,
    isGraduated: batch.status === "INACTIVE" || raw > maxSemesters,
    status: batch.status ?? "ACTIVE",
    graduationAcademicYearId: batch.graduationAcademicYearId ?? null,
    currentSemesterInYear: getSemesterInYear(forDate),
    currentAcademicYearName: getCurrentAcademicYearBounds(forDate).name,
  };
}
