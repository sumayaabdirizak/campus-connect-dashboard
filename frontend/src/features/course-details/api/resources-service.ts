import {
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceFilters,
  UploadResourceFileResult,
  CourseModule,
  CreateModuleData,
  UpdateModuleData,
  ReorderItem,
  ResourceProgressInput,
  MyResourceProgress,
  ResourceAnalytics
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

// ─── Watch tracking (video / audio analytics) ───────────────────────────────

/// Fire-and-forget heartbeat from the media player. Throttled by the caller;
/// failures are swallowed there so a dropped beat never interrupts playback.
export async function recordResourceProgress(
  resourceId: number,
  input: ResourceProgressInput
): Promise<MyResourceProgress> {
  return fetchWithAuth<MyResourceProgress>(`/resources/${resourceId}/progress`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

/// The student's own saved progress (for resume). Null when never watched.
export async function getMyResourceProgress(
  resourceId: number
): Promise<MyResourceProgress | null> {
  return fetchWithAuth<MyResourceProgress | null>(
    `/resources/${resourceId}/my-progress`,
    { cache: 'no-store' }
  );
}

/// Teacher per-student watch analytics for one resource.
export async function getResourceAnalytics(
  resourceId: number
): Promise<ResourceAnalytics> {
  return fetchWithAuth<ResourceAnalytics>(`/resources/${resourceId}/analytics`, {
    cache: 'no-store'
  });
}

export function resourceDownloadUrl(resourceId: number): string {
  // Return a same-origin path that next.config.ts rewrites to the backend.
  // Same-origin requests carry cookies automatically — no CORS preflight,
  // no credentials juggling, no proxy Route Handler needed.
  return `/api/download/${resourceId}`;
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
