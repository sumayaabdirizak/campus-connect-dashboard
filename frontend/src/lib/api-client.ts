import { useAuthStore } from '@/lib/auth-store';
import { getApiBaseUrl } from '@/lib/api-config';
import { syncServerTimeFromResponse } from '@/lib/server-clock';

export class ApiError extends Error {
  status: number;
  data?: Record<string, unknown>;

  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL = getApiBaseUrl();
let refreshPromise: Promise<RefreshOutcome> | null = null;
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

/**
 * What a refresh attempt actually established.
 *
 * The distinction matters: only the server explicitly rejecting the refresh
 * token proves the session is over. A rate-limit, a 5xx or a dropped
 * connection prove nothing — treating those as "signed out" logged people out
 * mid-work over a momentary blip, discarding a refresh token that was still
 * valid for days.
 */
export type RefreshOutcome =
  /** New access cookie is in place; retry the original request. */
  | 'refreshed'
  /** Server rejected the refresh token. Session is over; redirect already done. */
  | 'signed-out'
  /** Couldn't complete (offline, rate-limited, server error). Session may well
   *  still be good — fail this request, keep the user where they are. */
  | 'unavailable';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestRefresh(): Promise<{
  outcome: RefreshOutcome;
  /** Worth an immediate second attempt? */
  retryable: boolean;
}> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch {
    // Offline, DNS failure, server not listening — nothing said about the session.
    return { outcome: 'unavailable', retryable: true };
  }

  syncServerTimeFromResponse(response);

  if (response.ok) {
    const data = (await response.json().catch(() => ({}))) as { csrfToken?: string };
    if (data?.csrfToken) csrfTokenInMemory = data.csrfToken;
    hasHandledAuthFailure = false;
    return { outcome: 'refreshed', retryable: false };
  }

  // 401/403 are the only answers that mean "this token is no good".
  if (response.status === 401 || response.status === 403) {
    handleAuthFailure();
    return { outcome: 'signed-out', retryable: false };
  }

  // 429 is the limiter asking us to back off — retrying now would only dig in.
  // Anything else (5xx, proxy hiccup) is worth one more try.
  return { outcome: 'unavailable', retryable: response.status !== 429 };
}

/**
 * Refreshes the access cookie. Exported so the Socket.IO layers can recover
 * from an expired-token handshake rejection — they share this promise so three
 * sockets failing at once still only fire one `/auth/refresh`.
 */
export async function tryRefreshAccessToken(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const first = await requestRefresh();
      // One retry for a transient failure — a single dropped request
      // shouldn't cost the session.
      if (!first.retryable) return first.outcome;
      await sleep(700);
      return (await requestRefresh()).outcome;
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
  syncServerTimeFromResponse(csrfResponse);
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
  // Do not set Content-Type on GET/HEAD — it forces a CORS preflight and is
  // useless without a body.
  if (!isFormData && method !== 'GET' && method !== 'HEAD') {
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
  syncServerTimeFromResponse(response);

  if (
    response.status === 401 &&
    endpoint !== '/auth/login' &&
    endpoint !== '/auth/refresh' &&
    endpoint !== '/auth/logout'
  ) {
    const outcome = await tryRefreshAccessToken();
    if (outcome === 'refreshed') {
      if (needsCsrf && csrfTokenInMemory) {
        headers.set('X-CSRF-Token', csrfTokenInMemory);
      }
      const retryResponse = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });
      syncServerTimeFromResponse(retryResponse);
      if (retryResponse.ok) {
        return retryResponse.json();
      }
      const retryError = await retryResponse.json().catch(() => ({}));
      throw new ApiError(
        retryError.message || `API error: ${retryResponse.status} ${retryResponse.statusText}`,
        retryResponse.status,
        retryError
      );
    }

    // Couldn't reach the refresh endpoint. The session is probably still fine,
    // so fail just this request and leave the user where they are — 503 rather
    // than 401 so callers don't mistake it for an auth failure and sign out.
    if (outcome === 'unavailable') {
      throw new ApiError(
        'Could not reach the server to renew your session. Check your connection and try again.',
        503
      );
    }

    // 'signed-out' — handleAuthFailure already cleared state and redirected.
    throw new ApiError('Session expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    if (response.status === 403 && needsCsrf) {
      csrfTokenInMemory = null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `API error: ${response.status} ${response.statusText}`,
      response.status,
      errorData
    );
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
