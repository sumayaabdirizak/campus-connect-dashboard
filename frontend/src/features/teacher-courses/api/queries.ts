import { useQuery } from '@/lib/async-query';
import { getTeacherCourses, getCourseDetail } from './service';

export const useTeacherCourses = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['teacher-courses'],
    queryFn: getTeacherCourses,
    enabled
  });
};

export const useCourseDetail = (offeringId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['teacher-course-detail', offeringId],
    queryFn: () => getCourseDetail(offeringId),
    enabled: !!offeringId && enabled
  });
};
