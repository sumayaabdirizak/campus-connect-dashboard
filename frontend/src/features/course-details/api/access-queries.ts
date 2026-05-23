import { useEffect } from 'react';
import { useMutation, useQuery } from '@/lib/async-query';
import { getCourseAccess, pingCourseAccess } from './access-service';

export const accessKeys = {
  all: ['course-access'] as const,
  list: (courseOfferingId: string) => [...accessKeys.all, courseOfferingId] as const
};

export function useCourseAccessList(courseOfferingId: string) {
  return useQuery({
    queryKey: accessKeys.list(courseOfferingId),
    queryFn: () => getCourseAccess(courseOfferingId)
  });
}

/// Fires once when the course detail mounts (and whenever the offering id
/// changes) to upsert the caller's CourseOfferingAccess row. Failures are
/// swallowed — this is best-effort presence tracking, not a critical path.
export function usePingCourseAccess(courseOfferingId: string) {
  const mutation = useMutation({
    mutationFn: () => pingCourseAccess(courseOfferingId)
  });

  useEffect(() => {
    if (!courseOfferingId) return;
    mutation.mutate(undefined, {
      onError: () => {
        /* ignore */
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseOfferingId]);
}
