import { apiClient } from '@/lib/api-client';
import { UsersResponse } from './types';

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
  let endpoint = `/faculty/users?role=${role}&limit=100`;
  const response = await apiClient<UsersResponse>(endpoint);

  if (unassigned) {
    return {
      ...response,
      users: response.users.filter((u: any) => !u.isAssigned)
    };
  }

  return response;
};

export const fetchBatches = async () => {
  return apiClient<{ batches: Batch[] }>('/faculty/batches');
};

export const fetchBatchSections = async (batchId?: number) => {
  // Assuming batch sections are under /faculty/batches/:id/sections or generic /batch-sections
  // Since I mounted batchSectionRouter at /api/batch-sections and it now allows DEAN, I'll use that
  let endpoint = '/batch-sections';
  if (batchId) endpoint += `?batchId=${batchId}`;
  return apiClient<{ sections: BatchSection[] }>(endpoint);
};

export const createBatch = async (data: any) => {
  return apiClient<any>('/faculty/batches', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const createSection = async (data: any) => {
  // Batch sections router allows DEAN now
  return apiClient<any>('/batch-sections', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const assignStudentToSection = async (data: {
  studentId: number;
  batchSectionId: number;
  registrationAcademicYearId: number;
  currentAcademicYearId: number;
  currentSemesterId: number;
}) => {
  return apiClient<any>('/faculty/assign-student', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};
