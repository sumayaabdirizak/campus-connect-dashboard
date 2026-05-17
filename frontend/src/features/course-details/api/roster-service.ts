import { RosterStudent } from './roster-types';
import { apiClient } from '@/lib/api-client';

async function fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, options);
}

export async function getRoster(courseOfferingId: string): Promise<RosterStudent[]> {
  return fetchWithAuth<RosterStudent[]>(`/roster/${courseOfferingId}`);
}

export async function removeFromRoster(
  courseOfferingId: string,
  studentId: string
): Promise<{ success: boolean }> {
  return fetchWithAuth<{ success: boolean }>(`/roster/${courseOfferingId}/students/${studentId}`, {
    method: 'DELETE'
  });
}
