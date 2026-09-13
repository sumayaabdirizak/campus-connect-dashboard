/** Mirrors backend calendar: Sept–Aug year, 2 semesters. */
const SEMESTERS_PER_YEAR = 2;
const YEAR_START_MONTH = 9; // September
const SEMESTER2_START_MONTH = 3; // March

export function currentAcademicStartYear(forDate = new Date()): number {
  const year = forDate.getFullYear();
  const month = forDate.getMonth() + 1;
  return month >= YEAR_START_MONTH ? year : year - 1;
}

export function currentSemesterInYear(forDate = new Date()): number {
  const month = forDate.getMonth() + 1;
  if (month >= YEAR_START_MONTH || month < SEMESTER2_START_MONTH) return 1;
  return 2;
}

export function computeCohortSemester(
  cohortStartYear: number,
  durationYears: number,
  forDate = new Date()
): { cohortSemester: number; maxSemesters: number; isGraduated: boolean } {
  const maxSemesters = Math.max(1, durationYears) * SEMESTERS_PER_YEAR;
  const yearsElapsed = Math.max(0, currentAcademicStartYear(forDate) - cohortStartYear);
  const raw = yearsElapsed * SEMESTERS_PER_YEAR + currentSemesterInYear(forDate);
  return {
    cohortSemester: Math.min(raw, maxSemesters),
    maxSemesters,
    isGraduated: raw > maxSemesters
  };
}

/** Select options for cohort progress (Semester 1 … max). */
export function cohortSemesterOptions(durationYears: number) {
  const max = Math.max(1, durationYears) * SEMESTERS_PER_YEAR;
  return Array.from({ length: max }, (_, index) => {
    const n = index + 1;
    return { value: String(n), label: `Semester ${n}` };
  });
}
