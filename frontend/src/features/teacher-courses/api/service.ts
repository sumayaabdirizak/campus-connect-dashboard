import { apiClient } from '@/lib/api-client';

export const getTeacherCourses = async () => {
  return apiClient<any[]>('/lecturer-portal/courses');
};

export const getCourseDetail = async (offeringId: string) => {
  return apiClient<any>(`/lecturer-portal/courses/${offeringId}`);
};
