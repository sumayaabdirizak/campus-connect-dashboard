import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getClockSkewMs,
  serverNow,
  syncServerTime,
} from '@/lib/server-clock';

describe('server-clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T10:00:00.000Z'));
    syncServerTime('2026-08-22T10:00:00.000Z');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with zero skew after sync to same instant', () => {
    expect(getClockSkewMs()).toBe(0);
    expect(serverNow()).toBe(Date.now());
  });

  it('corrects when device clock is ahead of server', () => {
    syncServerTime('2026-08-22T09:00:00.000Z');
    expect(getClockSkewMs()).toBe(60 * 60 * 1000);
    expect(serverNow()).toBe(new Date('2026-08-22T09:00:00.000Z').getTime());
  });

  it('corrects when device clock is behind server', () => {
    syncServerTime('2026-08-22T11:00:00.000Z');
    expect(getClockSkewMs()).toBe(-60 * 60 * 1000);
    expect(serverNow()).toBe(new Date('2026-08-22T11:00:00.000Z').getTime());
  });
});
