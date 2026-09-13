import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression cover for the session-loss bug: a refresh that merely *failed to
 * complete* (offline, rate-limited, 5xx) used to be treated the same as the
 * server rejecting the token, so a momentary blip signed the user out and
 * threw away a refresh token that was still valid for days.
 *
 * Only 401/403 may end the session.
 */

const replace = vi.fn();
const clearAuth = vi.fn();

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: { getState: () => ({ clearAuth }) }
}));
vi.mock('@/lib/server-clock', () => ({ syncServerTimeFromResponse: vi.fn() }));
vi.mock('@/lib/api-config', () => ({ getApiBaseUrl: () => 'http://api.test' }));

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body
  } as unknown as Response;
}

/** Fresh module per test — the refresh single-flight and the
 *  "already redirected" latch are module-level state. */
async function loadClient() {
  vi.resetModules();
  return import('./api-client');
}

beforeEach(() => {
  replace.mockClear();
  clearAuth.mockClear();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('window', { location: { replace } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('tryRefreshAccessToken', () => {
  it('reports refreshed and does not sign out on success', async () => {
    const { tryRefreshAccessToken } = await loadClient();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { csrfToken: 'abc' }));

    await expect(tryRefreshAccessToken()).resolves.toBe('refreshed');
    expect(clearAuth).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('signs out only when the server rejects the refresh token', async () => {
    for (const status of [401, 403]) {
      const { tryRefreshAccessToken } = await loadClient();
      clearAuth.mockClear();
      replace.mockClear();
      vi.mocked(fetch).mockResolvedValue(jsonResponse(status));

      await expect(tryRefreshAccessToken()).resolves.toBe('signed-out');
      expect(clearAuth).toHaveBeenCalledOnce();
      expect(replace).toHaveBeenCalledWith('/auth/sign-in');
    }
  });

  it('keeps the session when the network is down', async () => {
    const { tryRefreshAccessToken } = await loadClient();
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(tryRefreshAccessToken()).resolves.toBe('unavailable');
    expect(clearAuth).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps the session when rate-limited, and does not retry into the limiter', async () => {
    const { tryRefreshAccessToken } = await loadClient();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(429));

    await expect(tryRefreshAccessToken()).resolves.toBe('unavailable');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('retries once on a server error and succeeds if the second try works', async () => {
    const { tryRefreshAccessToken } = await loadClient();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'abc' }));

    await expect(tryRefreshAccessToken()).resolves.toBe('refreshed');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('shares one in-flight refresh across concurrent callers', async () => {
    const { tryRefreshAccessToken } = await loadClient();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { csrfToken: 'abc' }));

    const results = await Promise.all([
      tryRefreshAccessToken(),
      tryRefreshAccessToken(),
      tryRefreshAccessToken()
    ]);

    expect(results).toEqual(['refreshed', 'refreshed', 'refreshed']);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('apiClient 401 handling', () => {
  it('retries the original request after a successful refresh', async () => {
    const { apiClient } = await loadClient();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401)) // original
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'abc' })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { ok: true })); // retry

    await expect(apiClient('/thing')).resolves.toEqual({ ok: true });
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('fails the request without signing out when refresh is unreachable', async () => {
    const { apiClient, ApiError } = await loadClient();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401)) // original
      .mockRejectedValue(new TypeError('Failed to fetch')); // refresh + retry

    await expect(apiClient('/thing')).rejects.toMatchObject({
      name: 'ApiError',
      // 503, not 401 — callers must not read this as an auth failure.
      status: 503
    });
    expect(ApiError).toBeDefined();
    expect(clearAuth).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('signs out when refresh is genuinely rejected', async () => {
    const { apiClient } = await loadClient();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401)) // original
      .mockResolvedValueOnce(jsonResponse(401)); // refresh says no

    await expect(apiClient('/thing')).rejects.toMatchObject({ status: 401 });
    expect(clearAuth).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/auth/sign-in');
  });
});
