import { computeAnnouncementAnalytics } from "./announcementAnalytics.service.js";

function utcDayStart(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/**
 * Upsert one `AnnouncementAnalyticsSnapshot` row for `announcementId` at `snapshotAt` (UTC midnight).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} announcementId
 * @param {Date} snapshotAt
 */
export async function upsertAnnouncementAnalyticsSnapshot(prisma, announcementId, snapshotAt) {
  // Nightly snapshots must reflect ground truth — bypass the in-process cache.
  const live = await computeAnnouncementAnalytics(prisma, announcementId, { forceRefresh: true });
  if (!live) return false;

  const impressions = live.impressionsLive ?? live.eligibleRecipients ?? 0;
  const readRate = live.readRate == null ? null : Number(live.readRate);
  const ackCount =
    live.acknowledgement && typeof live.acknowledgement.acknowledgedCount === "number"
      ? live.acknowledgement.acknowledgedCount
      : 0;

  await prisma.announcementAnalyticsSnapshot.upsert({
    where: {
      announcementId_snapshotAt: {
        announcementId,
        snapshotAt,
      },
    },
    create: {
      announcementId,
      snapshotAt,
      impressions,
      uniqueReaders: live.uniqueReaders,
      readRate,
      likes: live.likes,
      acknowledgedCount: ackCount,
      linkClicks: live.linkClicks,
    },
    update: {
      impressions,
      uniqueReaders: live.uniqueReaders,
      readRate,
      likes: live.likes,
      acknowledgedCount: ackCount,
      linkClicks: live.linkClicks,
    },
  });
  return true;
}

/**
 * Nightly job: snapshot recent published announcements (bounded for performance).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 */
export async function runAnnouncementAnalyticsSnapshotJob(prisma) {
  const snapshotAt = utcDayStart();
  const since = new Date(snapshotAt);
  since.setUTCDate(since.getUTCDate() - 120);

  const rows = await prisma.announcement.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ publishedAt: { gte: since } }, { updatedAt: { gte: since } }],
    },
    select: { id: true },
    take: 1500,
    orderBy: { updatedAt: "desc" },
  });

  let ok = 0;
  for (const r of rows) {
    const did = await upsertAnnouncementAnalyticsSnapshot(prisma, r.id, snapshotAt);
    if (did) ok += 1;
  }
  return { snapshotAt: snapshotAt.toISOString(), processed: rows.length, upserted: ok };
}
