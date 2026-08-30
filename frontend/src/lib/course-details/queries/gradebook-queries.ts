import { useQuery } from '@/lib/async-query';
import { getGradebook, getMyGrades } from '../services/gradebook-service';
import {
  type LiveQueryOptions,
  withCourseLiveRefresh
} from './live-query-options';

export const gradebookKeys = {
  all: ['gradebook'] as const,
  detail: (courseOfferingId: string) => [...gradebookKeys.all, courseOfferingId] as const,
  mine: (courseOfferingId: string) => [...gradebookKeys.all, courseOfferingId, 'me'] as const
};

export function useGradebook(
  courseOfferingId: string,
  enabled = true,
  options?: LiveQueryOptions
) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: gradebookKeys.detail(courseOfferingId),
    queryFn: () => getGradebook(courseOfferingId),
    enabled,
    ...withCourseLiveRefresh(live)
  });
}

export function useMyGrades(
  courseOfferingId: string,
  enabled = true,
  options?: LiveQueryOptions
) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: gradebookKeys.mine(courseOfferingId),
    queryFn: () => getMyGrades(courseOfferingId),
    enabled,
    ...withCourseLiveRefresh(live)
  });
}
