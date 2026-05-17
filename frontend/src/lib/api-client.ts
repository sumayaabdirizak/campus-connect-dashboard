import { useAuthStore } from '@/lib/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
let refreshPromise: Promise<boolean> | null = null;
let csrfTokenInMemory: string | null = null;
let hasHandledAuthFailure = false;

function handleAuthFailure(): void {
  if (hasHandledAuthFailure) return;
  hasHandledAuthFailure = true;
  csrfTokenInMemory = null;
  useAuthStore.getState().clearAuth();
  if (typeof window !== 'undefined') {
    window.location.replace('/auth/sign-in');
  }
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      if (refreshResponse.ok) {
        const data = (await refreshResponse.json().catch(() => ({}))) as { csrfToken?: string };
        if (data?.csrfToken) csrfTokenInMemory = data.csrfToken;
        hasHandledAuthFailure = false;
      } else {
        handleAuthFailure();
      }
      return refreshResponse.ok;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Exported for multipart uploads (XHR) that cannot use `apiClient`. */
export async function ensureCsrfToken(): Promise<string | null> {
  if (csrfTokenInMemory) return csrfTokenInMemory;
  const csrfResponse = await fetch(`${API_BASE_URL}/auth/csrf`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!csrfResponse.ok) return null;
  const data = (await csrfResponse.json().catch(() => ({}))) as { csrfToken?: string };
  csrfTokenInMemory = data?.csrfToken ?? null;
  return csrfTokenInMemory;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  isFormData: boolean = false
): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method || 'GET').toUpperCase();
  const needsCsrf =
    method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH';
  if (!isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (
    needsCsrf &&
    endpoint !== '/auth/login' &&
    endpoint !== '/auth/refresh' &&
    endpoint !== '/auth/csrf'
  ) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      if (needsCsrf && csrfTokenInMemory) {
        headers.set('X-CSRF-Token', csrfTokenInMemory);
      }
      const retryResponse = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });
      if (retryResponse.ok) {
        return retryResponse.json();
      }
      const retryError = await retryResponse.json().catch(() => ({}));
      throw new Error(
        retryError.message || `API error: ${retryResponse.status} ${retryResponse.statusText}`
      );
    }
    handleAuthFailure();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!response.ok) {
    if (response.status === 403 && needsCsrf) {
      csrfTokenInMemory = null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`);
  }

  if (endpoint === '/auth/login' || endpoint === '/auth/csrf') {
    const data = (await response.json()) as T & { csrfToken?: string };
    if (typeof data === 'object' && data && 'csrfToken' in data && data.csrfToken) {
      csrfTokenInMemory = data.csrfToken as string;
    }
    return data;
  }

  return response.json();
}
