import { REPORT_PERIODS } from './types';
import { serverNowDate } from '@/lib/server-clock';

export type ReportDateRange = { from: string | null; to: string | null };

export type ReportDateRangeErrors = {
  from?: string;
  to?: string;
  general?: string;
};

export const REPORT_PERIOD_OPTIONS = REPORT_PERIODS.map((p) => ({
  id: p.id,
  label: p.id === 'all' ? 'All Time' : p.label
}));

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Latest selectable calendar day (server clock). */
export function todayIsoDate(): string {
  return toIsoDate(serverNowDate());
}

/** Clamp an ISO date string to [min, max] when bounds are set. */
export function clampIsoDate(
  value: string | null | undefined,
  min?: string | null,
  max?: string | null
): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  let v = raw.slice(0, 10);
  if (min && v < min) v = min;
  if (max && v > max) v = max;
  return v;
}

/**
 * Validate custom report date range.
 * Returns null when valid; otherwise field-level error messages.
 */
export function validateReportDateRange(
  range: ReportDateRange,
  opts?: { requireAny?: boolean; minDate?: string | null; maxDate?: string | null }
): ReportDateRangeErrors | null {
  const today = todayIsoDate();
  const maxAllowed = opts?.maxDate && opts.maxDate < today ? opts.maxDate : today;
  const minAllowed = opts?.minDate ?? null;
  const errors: ReportDateRangeErrors = {};
  const from = range.from?.slice(0, 10) ?? null;
  const to = range.to?.slice(0, 10) ?? null;

  if (opts?.requireAny && !from && !to) {
    return { general: 'Pick at least one date for a custom period.' };
  }

  if (from && from > maxAllowed) {
    errors.from = 'From date cannot be in the future.';
  }
  if (to && to > maxAllowed) {
    errors.to = 'To date cannot be in the future.';
  }
  if (minAllowed && from && from < minAllowed) {
    errors.from = 'From date cannot be before the semester start.';
  }
  if (minAllowed && to && to < minAllowed) {
    errors.to = 'To date cannot be before the semester start.';
  }
  if (from && to && from > to) {
    if (!errors.from) errors.from = 'From must be on or before To.';
    if (!errors.to) errors.to = 'To must be on or after From.';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export function reportDateRangeErrorMessage(errors: ReportDateRangeErrors): string {
  return errors.general ?? errors.from ?? errors.to ?? 'Fix the date range.';
}

/** Map a preset id to default from/to (to = today). */
export function presetToDateRange(presetId: string): ReportDateRange {
  // Semester / all / custom: let the API resolve the window (no from/to).
  if (
    presetId === 'all' ||
    presetId === 'custom' ||
    presetId === 'semester'
  ) {
    return { from: null, to: null };
  }
  const months = Number(presetId);
  if (!Number.isFinite(months) || months <= 0) {
    return { from: null, to: null };
  }
  const to = serverNowDate();
  const from = new Date(serverNowDate());
  from.setMonth(from.getMonth() - months);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

/** Sensible default when switching to a custom period (last 30 days). */
export function defaultCustomDateRange(): ReportDateRange {
  const to = todayIsoDate();
  const from = new Date(serverNowDate());
  from.setMonth(from.getMonth() - 1);
  return { from: toIsoDate(from), to };
}

/** Clamp custom range to server "today" and from/to ordering. */
export function clampReportDateRange(range: ReportDateRange): ReportDateRange {
  const today = todayIsoDate();
  const maxTo = range.to && range.to <= today ? range.to : today;
  const from = clampIsoDate(range.from, null, maxTo);
  const to = clampIsoDate(range.to, from, today);
  return { from, to };
}

export function resolveAppliedReportFilters(filters: {
  periodPreset: string;
  dateRange: ReportDateRange;
  status?: string;
}): {
  period: string;
  dateRange: ReportDateRange;
  status: string;
} {
  const period = filters.periodPreset === 'custom' ? 'custom' : filters.periodPreset;
  const dateRange =
    filters.periodPreset === 'custom'
      ? filters.dateRange
      : presetToDateRange(filters.periodPreset);
  return {
    period,
    dateRange,
    status: filters.status && filters.status !== 'all' ? filters.status : 'all'
  };
}

export function inferPresetFromRange(range: ReportDateRange, periodParam: string): string {
  if (range.from || range.to) return 'custom';
  if (periodParam === 'custom') return 'custom';
  if (REPORT_PERIOD_OPTIONS.some((p) => p.id === periodParam)) return periodParam;
  return 'semester';
}

export function readDateRangeFromParams(params: URLSearchParams): ReportDateRange {
  const from = params.get('from');
  const to = params.get('to');
  return {
    from: from && from.length >= 8 ? from.slice(0, 10) : null,
    to: to && to.length >= 8 ? to.slice(0, 10) : null
  };
}
