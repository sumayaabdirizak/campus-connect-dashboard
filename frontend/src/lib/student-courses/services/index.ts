import { apiClient } from '@/lib/api-client';
import type { SemesterHistoryEntry, StudentCourse, StudentCoursesResponse } from '../types';
import type { CourseOfferingDetail } from '@/lib/teacher-courses/types';

export const getStudentCourses = async () => {
  return apiClient<StudentCoursesResponse>('/student-portal/my-courses');
};

export const getSemesterHistory = async () => {
  return apiClient<{ success: boolean; semesters: SemesterHistoryEntry[] }>(
    '/student-portal/semester-history'
  );
};

export const getStudentCourseDetail = async (offeringId: string) => {
  // Both portals serialize the identical course-detail shape.
  return apiClient<CourseOfferingDetail>(`/student-portal/courses/${offeringId}`);
};
