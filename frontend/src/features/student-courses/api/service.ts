import { apiClient } from '@/lib/api-client';
import type { StudentCourse } from './types';

export const getStudentCourses = async () => {
  return apiClient<{ success: boolean; offerings: StudentCourse[]; registration: unknown }>(
    '/student-portal/my-courses'
  );
};

export const getStudentCourseDetail = async (offeringId: string) => {
  return apiClient<any>(`/student-portal/courses/${offeringId}`);
};
