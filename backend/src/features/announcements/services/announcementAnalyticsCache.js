/**
 * In-process LRU-ish cache for analytics payloads keyed by announcementId.
 *
 * Each entry has a configurable TTL (default 5 minutes). Bounded to
 * ANALYTICS_CACHE_MAX_ENTRIES to prevent unbounded growth. Uses Map insertion
 * order as the eviction heuristic.
 */

const ANALYTICS_CACHE = new Map();

const ANALYTICS_CACHE_TTL_MS = Math.max(
  5_000,
  Number(process.env.ANNOUNCEMENT_ANALYTICS_CACHE_TTL_MS ?? 5 * 60 * 1000),
);

const ANALYTICS_CACHE_MAX_ENTRIES = Math.max(
  10,
  Math.min(10_000, Number(process.env.ANNOUNCEMENT_ANALYTICS_CACHE_MAX_ENTRIES ?? 200)),
);

export function cacheGet(announcementId) {
  const entry = ANALYTICS_CACHE.get(announcementId);
  if (!entry) return null;
  if (Date.now() - entry.at >= ANALYTICS_CACHE_TTL_MS) {
    ANALYTICS_CACHE.delete(announcementId);
    return null;
  }
  return entry.payload;
}

export function cacheSet(announcementId, payload) {
  if (ANALYTICS_CACHE.size >= ANALYTICS_CACHE_MAX_ENTRIES) {
    const oldestKey = ANALYTICS_CACHE.keys().next().value;
    if (oldestKey !== undefined) ANALYTICS_CACHE.delete(oldestKey);
  }
  ANALYTICS_CACHE.set(announcementId, { at: Date.now(), payload });
}

/** Test hook — clears the entire cache. */
export function resetAnnouncementAnalyticsCacheForTests() {
  ANALYTICS_CACHE.clear();
}

/**
 * Invalidate cached analytics for one announcement.
 * Call from any mutation path that affects engagement counts.
 */
export function invalidateAnnouncementAnalyticsCache(announcementId) {
  ANALYTICS_CACHE.delete(announcementId);
}
