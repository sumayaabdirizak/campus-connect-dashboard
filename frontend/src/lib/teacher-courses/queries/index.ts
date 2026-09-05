import { useQuery } from '@/lib/async-query';
import {
  getTeacherCourses,
  getCourseDetail,
  getCourseReportsList,
  getCourseReportDetail
} from '../services';

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

export const useCourseReportsList = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['teacher-course-reports'],
    queryFn: getCourseReportsList,
    enabled
  });
};

export const useCourseReportDetail = (offeringId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['teacher-course-report', offeringId],
    queryFn: () => getCourseReportDetail(offeringId),
    enabled: !!offeringId && enabled
  });
};
