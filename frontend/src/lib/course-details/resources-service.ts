/**
 * Course resources service
 */

import { apiClient } from '@/lib/api-client';

export interface CourseResource {
  id: string;
  title: string;
  description?: string;
  type: 'document' | 'video' | 'link' | 'file';
  url?: string;
  courseId: string;
  uploadedBy?: string;
  uploadedAt?: string;
  [key: string]: unknown;
}

export const resourcesService = {
  getByCourse: (courseId: string) =>
    apiClient<{ results: CourseResource[] }>(`/courses/${courseId}/resources`),

  getById: (resourceId: string) =>
    apiClient<CourseResource>(`/resources/${resourceId}`),

  create: (courseId: string, data: Omit<CourseResource, 'id' | 'courseId'>) =>
    apiClient<CourseResource>(`/courses/${courseId}/resources`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (resourceId: string, data: Partial<CourseResource>) =>
    apiClient<CourseResource>(`/resources/${resourceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (resourceId: string) =>
    apiClient(`/resources/${resourceId}`, {
      method: 'DELETE',
    }),
};
