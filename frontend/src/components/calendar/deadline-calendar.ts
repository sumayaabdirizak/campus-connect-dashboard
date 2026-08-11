/**
 * Deadline calendar utilities
 */

import type { DeadlineRow } from './lib';

/**
 * Filter and sort upcoming deadlines, prioritizing assignments and quizzes
 */
export function filterUpcomingDeadlines(deadlines: DeadlineRow[] | null | undefined): DeadlineRow[] {
  if (!deadlines || !Array.isArray(deadlines)) {
    return [];
  }

  const now = Date.now();

  // Filter to only future deadlines and events, sorted by date
  return deadlines
    .filter((d) => {
      if (!d.deadlineAt) return false;
      return new Date(d.deadlineAt).getTime() >= now;
    })
    .sort((a, b) => {
      const aTime = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Infinity;
      const bTime = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Infinity;
      return aTime - bTime;
    });
}
