import { describe, expect, it, vi } from 'vitest';
import {
  clampIsoDate,
  validateReportDateRange
} from '@/lib/reports/period-utils';

vi.mock('@/lib/server-clock', () => ({
  serverNowDate: () => new Date('2026-08-29T12:00:00')
}));

describe('validateReportDateRange', () => {
  it('requires at least one date when requireAny', () => {
    const err = validateReportDateRange({ from: null, to: null }, { requireAny: true });
    expect(err?.general).toBeTruthy();
  });

  it('rejects future dates', () => {
    const err = validateReportDateRange({
      from: '2026-09-01',
      to: '2026-09-02'
    });
    expect(err?.from).toMatch(/future/i);
    expect(err?.to).toMatch(/future/i);
  });

  it('rejects from after to', () => {
    const err = validateReportDateRange({
      from: '2026-08-20',
      to: '2026-08-10'
    });
    expect(err?.from).toMatch(/before/i);
    expect(err?.to).toMatch(/after/i);
  });

  it('accepts a valid custom range', () => {
    const err = validateReportDateRange({
      from: '2026-08-01',
      to: '2026-08-29'
    });
    expect(err).toBeNull();
  });
});

describe('clampIsoDate', () => {
  it('clamps to max', () => {
    expect(clampIsoDate('2026-12-01', null, '2026-08-29')).toBe('2026-08-29');
  });

  it('clamps to min', () => {
    expect(clampIsoDate('2026-01-01', '2026-08-10', '2026-08-29')).toBe('2026-08-10');
  });
});
