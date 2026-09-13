/** University academic calendar policy (Sept–Oct year, 2 semesters). */
export const ACADEMIC_CALENDAR_DEFAULTS = {
  yearStartMonth: 11, // November — Semester 1 start
  yearStartDay: 1,
  semester1EndMonth: 2, // February
  semester2StartMonth: 3, // March
  semester2EndMonth: 10, // October
  semester2EndDay: 31,
  semestersPerYear: 2,
  /** Fallback when faculty/program has no duration set. */
  defaultDurationYears: 4,
};

export function buildAcademicYearName(startYear) {
  return `${startYear}/${startYear + 1}`;
}

export function parseAcademicYearStartYear(name) {
  if (!name || typeof name !== "string") return null;
  const start = Number(name.split("/")[0]?.trim());
  return Number.isFinite(start) ? start : null;
}

/** Last calendar day of month (0-indexed month). */
export function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function maxSemestersForDuration(durationYears) {
  const years = Number(durationYears);
  const safe =
    Number.isFinite(years) && years > 0
      ? years
      : ACADEMIC_CALENDAR_DEFAULTS.defaultDurationYears;
  return safe * ACADEMIC_CALENDAR_DEFAULTS.semestersPerYear;
}
