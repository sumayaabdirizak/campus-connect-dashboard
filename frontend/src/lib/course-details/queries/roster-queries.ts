import { queryOptions, useQuery } from '@/lib/async-query';
import { getRoster } from '../services/roster-service';
import {
  type LiveQueryOptions,
  withCourseLiveRefresh
} from './live-query-options';

export const rosterKeys = {
  all: ['roster'] as const,
  list: (courseOfferingId: string) => [...rosterKeys.all, courseOfferingId] as const
};

export function useRoster(courseOfferingId: string, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: rosterKeys.list(courseOfferingId),
    queryFn: () => getRoster(courseOfferingId),
    ...withCourseLiveRefresh(live)
  });
}

export const rosterQueryOptions = (
  courseOfferingId: string,
  options?: LiveQueryOptions
) =>
  queryOptions({
    queryKey: rosterKeys.list(courseOfferingId),
    queryFn: () => getRoster(courseOfferingId),
    ...withCourseLiveRefresh(options?.live)
  });
