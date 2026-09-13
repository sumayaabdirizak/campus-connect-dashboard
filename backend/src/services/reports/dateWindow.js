/** Shared date-window parsing for list + detail report routes. */

import {
  isSemesterPeriod,
  resolveActiveSemesterWindow,
} from '../academic/resolveActiveSemesterWindow.js';

export function parseMonths(period) {
  if (
    period === 'all' ||
    period === undefined ||
    period === 'custom' ||
    isSemesterPeriod(period)
  ) {
    return 0;
  }
  return Number.isFinite(Number(period)) ? Number(period) : 0;
}

function startOfDay(raw) {
  const d = new Date(`${String(raw).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(raw) {
  const d = new Date(`${String(raw).slice(0, 10)}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthsAgo(months) {
  if (!months || months <= 0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

/**
 * Preset `period` (all / 3 / 6 / 12 / semester) or explicit `from` / `to`.
 * Custom dates win when either is present.
 */
export async function parseReportWindow(query = {}) {
  const fromRaw = query.from ? String(query.from).trim() : '';
  const toRaw = query.to ? String(query.to).trim() : '';

  if (fromRaw || toRaw) {
    const win = await resolveActiveSemesterWindow();
    const minSince = win.since;
    const maxUntil = win.untilClamped;
    const since = fromRaw ? startOfDay(fromRaw) : minSince;
    const until = toRaw ? endOfDay(toRaw) : maxUntil;

    if (since && since < minSince) {
      const err = new Error(
        'Reports only cover the current semester. From date cannot be before the current semester start.'
      );
      err.status = 400;
      throw err;
    }
    if (until && until > maxUntil) {
      const err = new Error(
        'Reports only cover the current semester. To date cannot be after the current semester window.'
      );
      err.status = 400;
      throw err;
    }
    if (since && until && since > until) {
      const err = new Error('From date must be on or before To date.');
      err.status = 400;
      throw err;
    }
    if (since && since > maxUntil) {
      const err = new Error('From date cannot be after the current semester window.');
      err.status = 400;
      throw err;
    }

    return {
      since,
      until,
      months: 0,
      periodLabel: null,
    };
  }

  if (isSemesterPeriod(query.period)) {
    const win = await resolveActiveSemesterWindow();
    return {
      since: win.since,
      until: win.untilClamped,
      months: win.monthsCount,
      periodLabel: win.label,
    };
  }

  const months = parseMonths(query.period);
  return {
    since: monthsAgo(months),
    until: null,
    months,
    periodLabel: months > 0 ? `Last ${months} months` : 'All time',
  };
}

/** Prisma `created_at` window — pass field name for camelCase models. */
export function createdAtFilter(since, until, field = 'created_at') {
  if (!since && !until) return {};
  const clause = {};
  if (since) clause.gte = since;
  if (until) clause.lte = until;
  return { [field]: clause };
}
