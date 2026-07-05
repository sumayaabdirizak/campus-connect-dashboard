import { apiClient } from '@/lib/api-client';
import type { Gradebook, MyGrades } from './gradebook-types';

export async function getGradebook(courseOfferingId: string): Promise<Gradebook> {
  return apiClient<Gradebook>(`/gradebook/${courseOfferingId}`);
}

export async function getMyGrades(courseOfferingId: string): Promise<MyGrades> {
  return apiClient<MyGrades>(`/gradebook/${courseOfferingId}/me`);
}
