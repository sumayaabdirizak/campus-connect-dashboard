/**
 * Programs service
 */

import { apiClient } from '@/lib/api-client';

export interface Program {
  id: string;
  name: string;
  code: string;
  departmentId?: string;
  department?: { id: string; name: string };
  active?: boolean;
  [key: string]: unknown;
}

export const programsService = {
  getAll: () =>
    apiClient<{ results: Program[] }>('/programs'),

  getById: (id: string) =>
    apiClient<Program>(`/programs/${id}`),

  getByDepartment: (departmentId: string) =>
    apiClient<{ results: Program[] }>(`/departments/${departmentId}/programs`),

  create: (data: Omit<Program, 'id'>) =>
    apiClient<Program>('/programs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Program>) =>
    apiClient<Program>(`/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient(`/programs/${id}`, {
      method: 'DELETE',
    }),
};
