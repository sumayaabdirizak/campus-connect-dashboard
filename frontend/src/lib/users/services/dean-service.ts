import { apiClient } from '@/lib/api-client';
import { UsersResponse } from '../types';

export interface Batch {
  id: number;
  name: string;
  academic_year: number;
  programId: number;
  academicYearId: number;
}

export interface BatchSection {
  id: number;
  name: string;
  batchId: number;
}

export const fetchUsersByRole = async (role: string, unassigned?: boolean) => {
  const endpoint = `/dean/users?role=${encodeURIComponent(role)}&limit=100`;
  const response = await apiClient<
    UsersResponse | { results?: UsersResponse['users']; total?: number }
  >(endpoint);

  const users =
    'users' in response && Array.isArray(response.users)
      ? response.users
      : 'results' in response
        ? (response.results ?? [])
        : [];

  const filtered = unassigned
    ? users.filter((u) => !(u as { isAssigned?: boolean }).isAssigned)
    : users;

  return {
    message: 'Users loaded',
    users: filtered,
    total_users: filtered.length
  };
};

export const fetchBatches = async () =>
  apiClient<{ batches: Batch[] }>('/dean/batches');

export const fetchBatchSections = async (batchId?: number) => {
  if (batchId) {
    return apiClient<{ sections: BatchSection[] }>(
      `/dean/batches/${batchId}/sections`
    );
  }
  const data = await apiClient<{
    results?: BatchSection[];
    sections?: BatchSection[];
  }>('/batch-sections?limit=200');
  return { sections: data.sections ?? data.results ?? [] };
};

export const assignStudentToSection = async (data: {
  studentId: number;
  batchSectionId: number;
  academicYearId: number;
  semesterId: number;
}) => {
  const { studentId, ...body } = data;
  return apiClient(`/dean/users/${studentId}/assign-section`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
};
