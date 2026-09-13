import { useQuery } from '@/lib/async-query';
import { getCourseMarkBudget } from '../services/mark-budget-service';

export const markBudgetKeys = {
  all: ['mark-budget'] as const,
  offering: (courseOfferingId: string) =>
    [...markBudgetKeys.all, courseOfferingId] as const
};

export function useCourseMarkBudget(courseOfferingId: string) {
  return useQuery({
    queryKey: markBudgetKeys.offering(courseOfferingId),
    queryFn: () => getCourseMarkBudget(courseOfferingId)
  });
}
