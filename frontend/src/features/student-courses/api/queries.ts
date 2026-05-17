import { useQuery } from '@/lib/async-query';
import { getStudentCourses, getStudentCourseDetail } from './service';

export const useStudentCourses = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['student-courses'],
    queryFn: getStudentCourses,
    enabled
  });
};

export const useStudentCourseDetail = (offeringId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['student-course-detail', offeringId],
    queryFn: () => getStudentCourseDetail(offeringId),
    enabled: !!offeringId && enabled
  });
};
