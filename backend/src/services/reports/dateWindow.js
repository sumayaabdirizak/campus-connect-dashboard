/** Shared date-window parsing for list + detail report routes. */

export function parseMonths(period) {
  if (period === 'all' || period === undefined || period === 'custom') return 0;
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
 * Preset `period` (all / 3 / 6 / 12) or explicit `from` / `to` query params.
 * Custom dates win when either is present.
 */
export function parseReportWindow(query = {}) {
  const fromRaw = query.from ? String(query.from).trim() : '';
  const toRaw = query.to ? String(query.to).trim() : '';

  if (fromRaw || toRaw) {
    const since = fromRaw ? startOfDay(fromRaw) : null;
    const until = toRaw ? endOfDay(toRaw) : null;
    const todayEnd = endOfDay(new Date().toISOString().slice(0, 10));

    if (since && todayEnd && since > todayEnd) {
      const err = new Error('From date cannot be in the future.');
      err.status = 400;
      throw err;
    }
    if (until && todayEnd && until > todayEnd) {
      const err = new Error('To date cannot be in the future.');
      err.status = 400;
      throw err;
    }
    if (since && until && since > until) {
      const err = new Error('From date must be on or before To date.');
      err.status = 400;
      throw err;
    }

    return {
      since,
      until,
      months: 0,
    };
  }

  const months = parseMonths(query.period);
  return {
    since: monthsAgo(months),
    until: null,
    months,
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
