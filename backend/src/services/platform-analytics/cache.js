const CACHE_TTL_MS = Number(process.env.PLATFORM_ANALYTICS_CACHE_TTL_MS || 120_000);
const cache = new Map();

function cacheKey(args = {}) {
  const period = args.period ?? args.periodMonths ?? 6;
  const from = args.from ?? '';
  const to = args.to ?? '';
  return `${args.facultyId ?? 'all'}:${period}:${from}:${to}`;
}

export function getCachedPlatformAnalytics(args) {
  const key = cacheKey(args);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedPlatformAnalytics(args, data) {
  cache.set(cacheKey(args), { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
