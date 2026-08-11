/**
 * Batches admin service
 */

import { apiClient } from '@/lib/api-client';

export const batchesService = {
  getSections: (batchId: string) =>
    apiClient<{ results: unknown[] }>(`/batches/${batchId}/sections`),

  getStudents: (sectionId: string) =>
    apiClient<{ results: unknown[] }>(`/sections/${sectionId}/students`),

  addStudents: (sectionId: string, studentIds: string[]) =>
    apiClient(`/sections/${sectionId}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentIds }),
    }),

  removeStudent: (sectionId: string, studentId: string) =>
    apiClient(`/sections/${sectionId}/students/${studentId}`, {
      method: 'DELETE',
    }),
};
