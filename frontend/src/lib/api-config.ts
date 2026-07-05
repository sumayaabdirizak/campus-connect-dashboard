/**
 * Single source of truth for API and backend origin URLs.
 *
 * Set NEXT_PUBLIC_API_URL in `.env.local`, e.g. `http://localhost:4000/api`.
 * The `/api` suffix is optional — we normalize it for REST calls.
 */

const DEFAULT_API_BASE = 'http://localhost:4000/api';

function normalizeApiBase(raw: string | undefined): string {
  const trimmed = (raw ?? DEFAULT_API_BASE).trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

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
