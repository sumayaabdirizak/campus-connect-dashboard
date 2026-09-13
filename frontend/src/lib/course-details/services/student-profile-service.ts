import { apiClient } from '@/lib/api-client';
import type { StudentWork } from './student-profile-types';

export async function getStudentWork(
  courseOfferingId: string,
  studentId: number
): Promise<StudentWork> {
  return apiClient<StudentWork>(
    `/course-offerings/course/${courseOfferingId}/students/${studentId}/work`,
    { cache: 'no-store' }
  );
}
