import { apiClient } from '@/lib/api-client';
import type { StudentCourse } from './types';
import type { CourseOfferingDetail } from '@/features/teacher-courses/api/types';

export const getStudentCourses = async () => {
  return apiClient<{ success: boolean; offerings: StudentCourse[]; registration: unknown }>(
    '/student-portal/my-courses'
  );
};

export const getStudentCourseDetail = async (offeringId: string) => {
  // Both portals serialize the identical course-detail shape.
  return apiClient<CourseOfferingDetail>(`/student-portal/courses/${offeringId}`);
};
