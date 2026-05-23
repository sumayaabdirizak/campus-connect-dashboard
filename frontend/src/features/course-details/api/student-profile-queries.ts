import { useQuery } from '@/lib/async-query';
import { getStudentWork } from './student-profile-service';

export const studentProfileKeys = {
  all: ['student-profile'] as const,
  work: (courseOfferingId: string, studentId: number | null) =>
    [...studentProfileKeys.all, 'work', courseOfferingId, studentId] as const
};

export function useStudentWork(courseOfferingId: string, studentId: number | null) {
  return useQuery({
    queryKey: studentProfileKeys.work(courseOfferingId, studentId),
    queryFn: () =>
      studentId == null
        ? Promise.reject(new Error('No studentId'))
        : getStudentWork(courseOfferingId, studentId),
    enabled: !!studentId
  });
}
