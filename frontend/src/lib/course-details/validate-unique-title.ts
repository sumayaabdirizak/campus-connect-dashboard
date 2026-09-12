/** Case-insensitive title uniqueness within a course list. */

export function normalizeCourseTitle(title: string | null | undefined): string {
  return String(title ?? '').trim();
}

export function isDuplicateCourseTitle(
  title: string | null | undefined,
  existing: Array<{ id: number; title: string }>,
  excludeId?: number
): boolean {
  const needle = normalizeCourseTitle(title).toLowerCase();
  if (!needle) return false;
  return existing.some(
    (item) =>
      item.id !== excludeId &&
      normalizeCourseTitle(item.title).toLowerCase() === needle
  );
}

export function duplicateAssignmentTitleMessage(title: string): string {
  return `An assignment named "${normalizeCourseTitle(title)}" already exists in this course`;
}

export function duplicateQuizTitleMessage(title: string): string {
  return `A quiz named "${normalizeCourseTitle(title)}" already exists in this course`;
}
