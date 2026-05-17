import { apiClient } from '@/lib/api-client';

export const getStudentCourses = async () => {
  return apiClient<{ success: boolean; offerings: any[]; registration: any }>(
    '/student-portal/my-courses'
  );
};

export const getStudentCourseDetail = async (offeringId: string) => {
  return apiClient<any>(`/student-portal/courses/${offeringId}`);
};
