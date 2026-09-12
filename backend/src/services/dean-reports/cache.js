const CACHE_TTL_MS = Number(process.env.DEAN_REPORTS_CACHE_TTL_MS || 120_000);
const cache = new Map();

function cacheKey({ facultyId, period, periodMonths, from, to, filters } = {}) {
  const filterPart = Object.entries(filters ?? {})
    .map(([k, v]) => `${k}=${v ?? ''}`)
    .sort()
    .join('&');
  return `${facultyId ?? 'all'}:${period}:${periodMonths}:${from ?? ''}:${to ?? ''}:${filterPart}`;
}

export function getCachedDeanReports(args) {
  const key = cacheKey(args);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedDeanReports(args, data) {
  cache.set(cacheKey(args), { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
