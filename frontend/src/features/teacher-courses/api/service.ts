import { apiClient } from '@/lib/api-client';
import { uploadJson } from '@/lib/upload-client';
import type { Course } from './types';

export const getTeacherCourses = async () => {
  return apiClient<Course[]>('/lecturer-portal/courses');
};

export const getCourseDetail = async (offeringId: string) => {
  return apiClient<any>(`/lecturer-portal/courses/${offeringId}`);
};

export interface CourseCoverResult {
  success: boolean;
  course: { id: number; name: string; code: string; thumbnail: string | null };
}

/** Upload a cover image for a course the teacher owns; returns the saved URL. */
export const uploadCourseCover = async (
  offeringId: string,
  file: File
): Promise<CourseCoverResult> => {
  const fd = new FormData();
  fd.append('cover', file);
  return uploadJson<CourseCoverResult>(`/lecturer-portal/courses/${offeringId}/cover`, fd);
};
