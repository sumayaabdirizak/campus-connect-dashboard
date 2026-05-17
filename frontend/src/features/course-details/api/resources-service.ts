import {
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceFilters
} from './resources-types';
import { apiClient } from '@/lib/api-client';

async function fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, options);
}

export async function getResources(
  courseId: string,
  filters?: ResourceFilters
): Promise<Resource[]> {
  const params = new URLSearchParams();
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithAuth<Resource[]>(`/resources/${courseId}${query}`, { cache: 'no-store' });
}

export async function getResource(resourceId: string): Promise<Resource> {
  return fetchWithAuth<Resource>(`/resources/${resourceId}`, { cache: 'no-store' });
}

export async function createResource(
  courseId: string,
  data: CreateResourceData
): Promise<Resource> {
  return fetchWithAuth<Resource>(`/resources/${courseId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateResource(
  resourceId: string,
  data: UpdateResourceData
): Promise<Resource> {
  return fetchWithAuth<Resource>(`/resources/${resourceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteResource(resourceId: string): Promise<{ success: boolean }> {
  return fetchWithAuth<{ success: boolean }>(`/resources/${resourceId}`, {
    method: 'DELETE'
  });
}
