/**
 * Single source of truth for API and backend origin URLs.
 *
 * Set NEXT_PUBLIC_API_URL in `.env.local`, e.g. `http://localhost:4000/api`.
 * The `/api` suffix is optional — we normalize it for REST calls.
 */

const DEFAULT_API_BASE = 'http://localhost:4000/api';

// Fail fast in production builds: a missing NEXT_PUBLIC_API_URL would
// otherwise silently ship a bundle pointing at localhost — every API call
// dies with a network error and nothing says why. Throwing here surfaces
// the misconfiguration at build time instead of in user consoles.
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not set. Production builds must point at a real ' +
      'backend — set it in the build environment (e.g. https://api.example.com/api).'
  );
}

function normalizeApiBase(raw: string | undefined): string {
  const trimmed = (raw ?? DEFAULT_API_BASE).trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

/** Exported for unit tests — prefer {@link getApiBaseUrl} in app code. */
export { normalizeApiBase };

/** REST base including `/api`, e.g. `http://localhost:4000/api` */
export function getApiBaseUrl(): string {
  return normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
}

/** Backend origin without `/api`, e.g. `http://localhost:4000` */
export function getBackendOrigin(): string {
  const base = getApiBaseUrl();
  return base.endsWith('/api') ? base.slice(0, -4) : base;
}

/** Socket.IO server URL (same origin as Express, no `/api` path). */
export function getSocketUrl(): string {
  return getBackendOrigin();
}

/** Build a full API path from a relative endpoint like `/users/me`. */
export function buildApiUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${getApiBaseUrl()}${path}`;
}
