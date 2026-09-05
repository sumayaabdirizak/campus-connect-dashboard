import { apiClient } from '@/lib/api-client';
import { uploadJson } from '@/lib/upload-client';
import type { Course, CourseOfferingDetail } from '../types';
import type {
  CourseReportDetail,
  CourseReportListResponse
} from '../course-report-types';

export const getTeacherCourses = async () => {
  return apiClient<Course[]>('/lecturer-portal/courses');
};

export const getCourseDetail = async (offeringId: string) => {
  return apiClient<CourseOfferingDetail>(`/lecturer-portal/courses/${offeringId}`);
};

export const getCourseReportsList = async () => {
  return apiClient<CourseReportListResponse>('/lecturer-portal/course-reports');
};

export const getCourseReportDetail = async (offeringId: string) => {
  return apiClient<CourseReportDetail>(`/lecturer-portal/course-reports/${offeringId}`);
};

export interface CourseCoverResult {
  success: boolean;
  course: { id: number; name: string; code: string; thumbnail: string | null };
}

export const uploadCourseCover = async (
  offeringId: string,
  file: File
): Promise<CourseCoverResult> => {
  const fd = new FormData();
  fd.append('cover', file);
  return uploadJson<CourseCoverResult>(`/lecturer-portal/courses/${offeringId}/cover`, fd);
};
