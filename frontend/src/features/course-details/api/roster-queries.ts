import { queryOptions, useQuery } from '@/lib/async-query';
import { getRoster } from './roster-service';

export const rosterKeys = {
  all: ['roster'] as const,
  list: (courseOfferingId: string) => [...rosterKeys.all, courseOfferingId] as const
};

export function useRoster(courseOfferingId: string) {
  return useQuery({
    queryKey: rosterKeys.list(courseOfferingId),
    queryFn: () => getRoster(courseOfferingId)
  });
}
