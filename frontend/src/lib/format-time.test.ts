import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { syncServerTime } from '@/lib/server-clock';
import { formatMessageWhen, relativeTime } from '@/lib/format-time';

describe('format-time', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T10:00:00.000Z'));
    syncServerTime('2026-08-22T10:00:00.000Z');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('relativeTime uses server clock', () => {
    expect(relativeTime('2026-08-22T09:55:00.000Z')).toBe('5m ago');
  });

  it('formatMessageWhen shows clock for same server day', () => {
    const iso = '2026-08-22T09:30:00.000Z';
    expect(formatMessageWhen(iso)).toMatch(/\d/);
  });
});
