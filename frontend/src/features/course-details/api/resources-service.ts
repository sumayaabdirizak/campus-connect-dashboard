import {
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceFilters,
  UploadResourceFileResult,
  CourseModule,
  CreateModuleData,
  UpdateModuleData,
  ReorderItem
} from './resources-types';
import { apiClient, ensureCsrfToken } from '@/lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

/// Multipart upload — bypasses `apiClient`'s JSON encoder. Returns the metadata
/// needed to chain into a normal `createResource` call.
export async function uploadResourceFile(file: File): Promise<UploadResourceFileResult> {
  const formData = new FormData();
  formData.append('file', file);
  const csrfToken = await ensureCsrfToken();
  const res = await fetch(`${API_BASE_URL}/resources/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Upload failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function resourceDownloadUrl(resourceId: number): string {
  return `${API_BASE_URL}/resources/${resourceId}/download`;
}

// ─── Modules ────────────────────────────────────────────────────────────────

export async function getModules(courseOfferingId: string): Promise<CourseModule[]> {
  return fetchWithAuth<CourseModule[]>(`/resources/${courseOfferingId}/modules`, {
    cache: 'no-store'
  });
}

export async function createModule(
  courseOfferingId: string,
  data: CreateModuleData
): Promise<CourseModule> {
  return fetchWithAuth<CourseModule>(`/resources/${courseOfferingId}/modules`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateModule(
  moduleId: number,
  data: UpdateModuleData
): Promise<CourseModule> {
  return fetchWithAuth<CourseModule>(`/resources/modules/${moduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteModule(moduleId: number): Promise<{ success: boolean }> {
  return fetchWithAuth<{ success: boolean }>(`/resources/modules/${moduleId}`, {
    method: 'DELETE'
  });
}

/// Bulk reorder. Wrapped in a single Prisma transaction server-side so a
/// concurrent reader never sees a half-shuffled list.
export async function reorderResources(items: ReorderItem[]): Promise<{ updated: number }> {
  return fetchWithAuth<{ updated: number }>(`/resources/reorder`, {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

export async function reorderModules(
  items: Pick<ReorderItem, 'id' | 'position'>[]
): Promise<{ updated: number }> {
  return fetchWithAuth<{ updated: number }>(`/resources/modules/reorder`, {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}
