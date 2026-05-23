import { RosterStudent, RosterRegistrationRow } from './roster-types';
import { apiClient } from '@/lib/api-client';

async function fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, options);
}

/// Backend returns StudentRegistration rows with a nested `student`. Flatten
/// here so every consumer keeps reading `s.full_name` / `s.id` directly —
/// `s.id` is the student's user id (not the registration id), which is what
/// every downstream table joins on.
export async function getRoster(courseOfferingId: string): Promise<RosterStudent[]> {
  const rows = await fetchWithAuth<RosterRegistrationRow[]>(`/roster/${courseOfferingId}`);
  return rows
    .filter((r) => r.student)
    .map((r) => ({
      id: r.student.id,
      full_name: r.student.full_name,
      email: r.student.email,
      number: r.student.number,
      status: r.status
    }));
}

export async function removeFromRoster(
  courseOfferingId: string,
  studentId: string
): Promise<{ success: boolean }> {
  return fetchWithAuth<{ success: boolean }>(`/roster/${courseOfferingId}/students/${studentId}`, {
    method: 'DELETE'
  });
}
