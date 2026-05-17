import {
  ClassSchedule,
  AttendanceRecord,
  AttendanceStats,
  CreateSessionData,
  CreateRecordData,
  UpdateRecordData,
  AttendanceFilters
} from './attendance-types';
import { apiClient } from '@/lib/api-client';

async function fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, options);
}

export async function getSessions(courseOfferingId: string): Promise<ClassSchedule[]> {
  return fetchWithAuth<ClassSchedule[]>(`/attendance/${courseOfferingId}/sessions`, {
    cache: 'no-store'
  });
}

export async function createSession(
  courseOfferingId: string,
  data: CreateSessionData
): Promise<ClassSchedule> {
  return fetchWithAuth<ClassSchedule>(`/attendance/${courseOfferingId}/sessions`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function deleteSession(
  courseOfferingId: string,
  scheduleId: string
): Promise<{ success: boolean }> {
  return fetchWithAuth<{ success: boolean }>(
    `/attendance/${courseOfferingId}/sessions/${scheduleId}`,
    {
      method: 'DELETE'
    }
  );
}

export async function getRecords(
  courseOfferingId: string,
  filters?: AttendanceFilters
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters?.scheduleId) params.append('scheduleId', filters.scheduleId);
  if (filters?.studentId) params.append('studentId', filters.studentId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithAuth<AttendanceRecord[]>(`/attendance/${courseOfferingId}/records${query}`, {
    cache: 'no-store'
  });
}

export async function createRecord(
  courseOfferingId: string,
  data: CreateRecordData
): Promise<AttendanceRecord> {
  return fetchWithAuth<AttendanceRecord>(`/attendance/${courseOfferingId}/records`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateRecord(
  courseOfferingId: string,
  recordId: string,
  data: UpdateRecordData
): Promise<AttendanceRecord> {
  return fetchWithAuth<AttendanceRecord>(`/attendance/${courseOfferingId}/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function getAttendanceStats(courseOfferingId: string): Promise<AttendanceStats> {
  return fetchWithAuth<AttendanceStats>(`/attendance/${courseOfferingId}/stats`, {
    cache: 'no-store'
  });
}
