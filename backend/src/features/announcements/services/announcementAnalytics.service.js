import { findAnnouncementRecipientUserIds } from "./announcementRecipients.service.js";
import { ANNOUNCEMENT_LIKE_EMOJI } from "../dto/announcementDto.js";

/**
 * In-process LRU-ish cache for analytics payloads keyed by announcementId.
 * Each entry has a 5-minute TTL (configurable). Avoids re-running 5–8 count
 * queries per analytics request on hot announcements while still returning
 * a fresh result within a small staleness window. Callers can bypass via
 * {@link computeAnnouncementAnalytics}'s `forceRefresh` argument.
 *
 * Bounded to ANALYTICS_CACHE_MAX_ENTRIES so a long tail of announcements
 * can't grow the cache unbounded. We use Map insertion order as the eviction
 * heuristic: on `set` we delete the oldest entry when at capacity.
 *
 * @type {Map<number, { at: number; payload: unknown }>}
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

function cacheGet(announcementId) {
  const entry = ANALYTICS_CACHE.get(announcementId);
  if (!entry) return null;
  if (Date.now() - entry.at >= ANALYTICS_CACHE_TTL_MS) {
    ANALYTICS_CACHE.delete(announcementId);
    return null;
  }
  return entry.payload;
}

function cacheSet(announcementId, payload) {
  if (ANALYTICS_CACHE.size >= ANALYTICS_CACHE_MAX_ENTRIES) {
    const oldestKey = ANALYTICS_CACHE.keys().next().value;
    if (oldestKey !== undefined) ANALYTICS_CACHE.delete(oldestKey);
  }
  ANALYTICS_CACHE.set(announcementId, { at: Date.now(), payload });
}

/** Test hook. */
export function resetAnnouncementAnalyticsCacheForTests() {
  ANALYTICS_CACHE.clear();
}

/**
 * Invalidate the cached analytics for one announcement. Call from any
 * mutation path that affects engagement counts (reads, likes, acks, link
 * clicks) so the next analytics request recomputes immediately rather than
 * waiting for TTL.
 *
 * @param {number} announcementId
 */
export function invalidateAnnouncementAnalyticsCache(announcementId) {
  ANALYTICS_CACHE.delete(announcementId);
}

/**
 * Rich analytics for announcements (reads over time, CTR proxy counts, acknowledgement completion).
 *
 * JSON response shape (documented contract):
 * - `announcementId`: number
 * - `publishedAt`, `generatedAt`: ISO strings
 * - `eligibleRecipients`: int — best-effort audience size (same basis as SMS recipients)
 * - `uniqueReaders`, `likes`, `linkClicks`: ints
 * - `readRate`: float | null — uniqueReaders / eligibleRecipients when eligibleRecipients > 0
 * - `readTimeSeries`: `{ bucketStart, newReaders, cumulativeReaders }[]` — hourly buckets from first publish (or create) time
 * - `acknowledgement`: null | `{ required, acknowledgedCount, eligibleCount, completionRate }`
 * - `snapshots`: last N daily `AnnouncementAnalyticsSnapshot` rows (UTC midnight keys)
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} announcementId
 * @param {{ forceRefresh?: boolean }} [options]
 */
export async function computeAnnouncementAnalytics(prisma, announcementId, options = {}) {
  if (!options.forceRefresh) {
    const cached = cacheGet(announcementId);
    if (cached) return cached;
  }
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: {
      id: true,
      publishedAt: true,
      createdAt: true,
      acknowledgementRequired: true,
      targetType: true,
      facultyId: true,
      departmentId: true,
      batchId: true,
      sectionId: true,
      targetRoles: true,
      imageUrls: true,
      bodyMarkdown: true,
      bodyHtml: true,
      content: true,
      title: true,
      status: true,
    },
  });
  if (!announcement) return null;

  const recipientIds = await findAnnouncementRecipientUserIds(prisma, announcement);
  const eligibleRecipients = recipientIds.length;

  const since = announcement.publishedAt ?? announcement.createdAt;

  const [uniqueReaders, likes, linkClicks, acknowledgedCount] = await Promise.all([
    prisma.announcementRead.count({ where: { announcementId } }),
    prisma.announcementReaction.count({
      where: { announcementId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
    }),
    prisma.announcementLinkClick.count({ where: { announcementId } }),
    announcement.acknowledgementRequired
      ? prisma.announcementAcknowledgement.count({ where: { announcementId } })
      : Promise.resolve(0),
  ]);

  const readRate = eligibleRecipients > 0 ? uniqueReaders / eligibleRecipients : null;

  /** @type {{ bucketStart: string; newReaders: number; cumulativeReaders: number }[]} */
  let readTimeSeries = [];
  try {
    const rows = await prisma.$queryRaw`
      SELECT date_trunc('hour', r."readAt") AS "bucket", COUNT(*)::int AS "cnt"
      FROM "AnnouncementRead" r
      WHERE r."announcementId" = ${announcementId}
        AND r."readAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    let cumulative = 0;
    readTimeSeries = (rows ?? []).map((row) => {
      const cnt = Number(row.cnt ?? 0);
      cumulative += cnt;
      const bucket = row.bucket instanceof Date ? row.bucket : new Date(row.bucket);
      return {
        bucketStart: bucket.toISOString(),
        newReaders: cnt,
        cumulativeReaders: cumulative,
      };
    });
  } catch {
    readTimeSeries = [];
  }

  const snapshots = await prisma.announcementAnalyticsSnapshot.findMany({
    where: { announcementId },
    orderBy: { snapshotAt: "desc" },
    take: 14,
    select: {
      snapshotAt: true,
      impressions: true,
      uniqueReaders: true,
      readRate: true,
      likes: true,
      acknowledgedCount: true,
      linkClicks: true,
    },
  });

  const acknowledgement = announcement.acknowledgementRequired
    ? {
        required: true,
        acknowledgedCount,
        eligibleCount: eligibleRecipients,
        completionRate: eligibleRecipients > 0 ? acknowledgedCount / eligibleRecipients : null,
      }
    : null;

  const payload = {
    schemaVersion: 1,
    announcementId,
    title: announcement.title,
    publishedAt: announcement.publishedAt ? announcement.publishedAt.toISOString() : null,
    generatedAt: new Date().toISOString(),
    eligibleRecipients,
    impressionsLive: eligibleRecipients,
    uniqueReaders,
    likes,
    linkClicks,
    readRate,
    readTimeSeries,
    acknowledgement,
    snapshots: snapshots.map((s) => ({
      snapshotAt: s.snapshotAt.toISOString(),
      impressions: s.impressions,
      uniqueReaders: s.uniqueReaders,
      readRate: s.readRate,
      likes: s.likes,
      acknowledgedCount: s.acknowledgedCount,
      linkClicks: s.linkClicks,
    })),
  };
  cacheSet(announcementId, payload);
  return payload;
}

/**
 * Paginated acknowledgement roster (dean/admin). `filter`: `all` | `acked` | `pending`.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} announcementId
 * @param {{ page: number; pageSize: number; filter: string }} opts
 */
export async function listAnnouncementAcknowledgements(prisma, announcementId, opts) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { id: true },
  });
  if (!announcement) return null;

  const full = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: {
      targetType: true,
      facultyId: true,
      departmentId: true,
      batchId: true,
      sectionId: true,
      targetRoles: true,
      imageUrls: true,
      bodyMarkdown: true,
      bodyHtml: true,
      content: true,
      title: true,
      status: true,
      acknowledgementRequired: true,
    },
  });
  if (!full || !full.acknowledgementRequired) return { empty: true, total: 0, results: [] };

  const recipientIds = await findAnnouncementRecipientUserIds(prisma, full);
  const ackRows = await prisma.announcementAcknowledgement.findMany({
    where: { announcementId },
    select: { userId: true, acknowledgedAt: true },
  });
  const ackMap = new Map(ackRows.map((r) => [r.userId, r.acknowledgedAt]));

  let ids = recipientIds;
  const f = String(opts.filter || "all").toLowerCase();
  if (f === "acked") ids = ids.filter((id) => ackMap.has(id));
  else if (f === "pending") ids = ids.filter((id) => !ackMap.has(id));

  const total = ids.length;
  const skip = (opts.page - 1) * opts.pageSize;
  const pageIds = ids.slice(skip, skip + opts.pageSize);

  if (!pageIds.length) {
    return { total, results: [] };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: pageIds } },
    select: { id: true, full_name: true, email: true, number: true },
    orderBy: { full_name: "asc" },
  });

  const order = new Map(pageIds.map((id, i) => [id, i]));
  users.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const results = users.map((u) => ({
    userId: u.id,
    full_name: u.full_name,
    email: u.email,
    number: u.number,
    acknowledged: ackMap.has(u.id),
    acknowledgedAt: ackMap.get(u.id)?.toISOString() ?? null,
  }));

  return { total, results };
}
