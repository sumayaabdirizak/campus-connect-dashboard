import type { AsyncQueryClient } from '@/lib/async-query';
import { gradebookKeys } from '@/lib/course-details/queries/gradebook-queries';

/** After grades / published work change — refresh gradebook + teacher course reports. */
export function invalidateCourseOutcomeQueries(queryClient: AsyncQueryClient) {
  queryClient.invalidateQueries({ queryKey: gradebookKeys.all });
  queryClient.invalidateQueries({ queryKey: ['teacher-course-reports'] });
  queryClient.invalidateQueries({ queryKey: ['teacher-course-report'] });
}
