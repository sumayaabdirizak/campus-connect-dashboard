import { useQuery } from '@/lib/async-query';
import { getGradebook, getMyGrades } from './gradebook-service';

export const gradebookKeys = {
  all: ['gradebook'] as const,
  detail: (courseOfferingId: string) => [...gradebookKeys.all, courseOfferingId] as const,
  mine: (courseOfferingId: string) => [...gradebookKeys.all, courseOfferingId, 'me'] as const
};

export function useGradebook(courseOfferingId: string, enabled = true) {
  return useQuery({
    queryKey: gradebookKeys.detail(courseOfferingId),
    queryFn: () => getGradebook(courseOfferingId),
    enabled
  });
}

export function useMyGrades(courseOfferingId: string, enabled = true) {
  return useQuery({
    queryKey: gradebookKeys.mine(courseOfferingId),
    queryFn: () => getMyGrades(courseOfferingId),
    enabled
  });
}
