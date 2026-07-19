import { describe, it, expect, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

import { parseApiError, ParsedApiError } from '@/lib/notifications';

describe('parseApiError', () => {
  it('classifies network failures', () => {
    const err = new TypeError('Failed to fetch');
    const parsed = parseApiError(err);
    expect(parsed.kind).toBe('network');
  });

  it('classifies HTTP status from error objects', () => {
    const err = Object.assign(new Error('nope'), { status: 401 });
    expect(parseApiError(err).kind).toBe('unauthorized');

    const forbidden = Object.assign(new Error('Forbidden'), { status: 403 });
    expect(parseApiError(forbidden).kind).toBe('forbidden');

    const missing = Object.assign(new Error('Not found'), { status: 404 });
    expect(parseApiError(missing).kind).toBe('not_found');

    const server = Object.assign(new Error('boom'), { status: 500 });
    expect(parseApiError(server).kind).toBe('server');
  });

  it('returns the same instance when already parsed', () => {
    const first = new ParsedApiError('x', 'validation');
    expect(parseApiError(first)).toBe(first);
  });
});
