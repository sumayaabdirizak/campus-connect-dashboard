import { apiClient } from '@/lib/api-client';

export interface CourseMarkBudget {
  courseMax: number;
  allocated: number;
  remaining: number;
}

export async function getCourseMarkBudget(courseOfferingId: string): Promise<CourseMarkBudget> {
  return apiClient<CourseMarkBudget>(`/course-offerings/${courseOfferingId}/mark-budget`);
}
