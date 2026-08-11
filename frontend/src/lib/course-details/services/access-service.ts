import { apiClient } from '@/lib/api-client';
import type { CourseAccessRow, PingResult } from './access-types';

export async function pingCourseAccess(courseOfferingId: string): Promise<PingResult> {
  return apiClient<PingResult>(`/course-access/${courseOfferingId}/ping`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function getCourseAccess(courseOfferingId: string): Promise<CourseAccessRow[]> {
  return apiClient<CourseAccessRow[]>(`/course-access/${courseOfferingId}`);
}
