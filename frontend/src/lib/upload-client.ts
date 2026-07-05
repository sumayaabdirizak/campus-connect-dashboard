import { buildApiUrl } from '@/lib/api-config';
import { ensureCsrfToken } from '@/lib/api-client';

export type UploadFetchOptions = Omit<RequestInit, 'body' | 'method'> & {
  method?: 'POST' | 'PUT' | 'PATCH';
};

/**
 * Multipart upload helper — uses cookie auth + CSRF like `apiClient`.
 * Use for FormData endpoints that cannot go through JSON apiClient.
 */
export async function uploadWithAuth(
  endpoint: string,
  formData: FormData,
  options: UploadFetchOptions = {}
): Promise<Response> {
  const csrf = await ensureCsrfToken();
  const headers = new Headers(options.headers);
  if (csrf) headers.set('X-CSRF-Token', csrf);

  return fetch(buildApiUrl(endpoint), {
    ...options,
    method: options.method ?? 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });
}

/** Parse JSON from an upload response or throw a readable error. */
export async function parseUploadJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || `Upload failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Upload FormData and parse JSON in one step. */
export async function uploadJson<T>(endpoint: string, formData: FormData): Promise<T> {
  const res = await uploadWithAuth(endpoint, formData);
  return parseUploadJson<T>(res);
}
