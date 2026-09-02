import type { GradebookRow } from '@/lib/course-details/services/gradebook-types';

export const GRADEBOOK_SORT_OPTS = [
  { id: 'name-asc', label: 'Student A–Z' },
  { id: 'name-desc', label: 'Student Z–A' },
  { id: 'overall-desc', label: 'Overall (high)' },
  { id: 'overall-asc', label: 'Overall (low)' }
];

export function sortGradebookRows(rows: GradebookRow[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') return b.name.localeCompare(a.name);
    if (sortId === 'overall-desc') {
      return (b.overallPct ?? -1) - (a.overallPct ?? -1);
    }
    if (sortId === 'overall-asc') {
      return (a.overallPct ?? -1) - (b.overallPct ?? -1);
    }
    return a.name.localeCompare(b.name);
  });
  return copy;
}
