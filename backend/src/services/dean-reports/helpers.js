export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function monthSeries(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1) + i, 1);
    return { label: MONTHS[d.getMonth()], key: `${d.getFullYear()}-${d.getMonth()}` };
  });
}

export function toMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function toDayKey(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export function periodStart(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - (months - 1));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function safe(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.warn('[dean-reports] query failed:', err?.message ?? err);
    return fallback;
  }
}

export function gradeToGpa(grade) {
  const g = Number(grade ?? 0);
  if (g >= 90) return 4.0;
  if (g >= 80) return 3.0;
  if (g >= 70) return 2.5;
  if (g >= 60) return 2.0;
  return 0.0;
}

export function performanceBand(grade) {
  const g = Number(grade ?? 0);
  if (g >= 90) return 'Excellent';
  if (g >= 80) return 'Very Good';
  if (g >= 70) return 'Good';
  if (g >= 60) return 'Pass';
  return 'Fail';
}

export function trendPct(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function offeringWhere(facultyId, filters = {}) {
  const base = { section: { batch: { program: { department: { facultyId } } } } };
  if (filters.departmentId) {
    base.section.batch.program.departmentId = Number(filters.departmentId);
  }
  if (filters.studentLevel) {
    const level = String(filters.studentLevel).toUpperCase().replace(/\s+/g, '_');
    if (level === 'UNDERGRADUATE' || level === 'POSTGRADUATE') {
      base.section.batch.program.level = level;
    }
  }
  if (filters.batchId) {
    base.section.batchId = Number(filters.batchId);
  }
  if (filters.sectionId) {
    base.sectionId = Number(filters.sectionId);
  }
  if (filters.academicYearId) base.academicYearId = Number(filters.academicYearId);
  if (filters.semesterId) base.semesterId = Number(filters.semesterId);
  return base;
}
