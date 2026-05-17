import { emitAnnouncementRealtimeEvent } from "./announcementRealtime.service.js";
import { writeAnnouncementAudit } from "./announcementService.js";
import { expireAnnouncementIfDue } from "./announcementExpiry.service.js";
import { announcementLog } from "../announcementLogger.js";

/**
 * Transition SCHEDULED → PUBLISHED when `publishedAt` is due (idempotent, race-safe).
 * Shared by BullMQ worker and DB fallback when Redis is off.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} announcementId
 * @param {{ source?: string }} [opts]
 * @returns {Promise<boolean>}
 */
export async function publishScheduledAnnouncementIfDue(prisma, announcementId, opts = {}) {
  const now = new Date();
  const source = opts.source ?? "unknown";
  /** BullMQ job delay targets publish time; DB fallback must match `publishedAt <= now`. */
  const where =
    source === "bullmq"
      ? { id: announcementId, status: "SCHEDULED" }
      : {
          id: announcementId,
          status: "SCHEDULED",
          publishedAt: { not: null, lte: now },
        };
  const result = await prisma.announcement.updateMany({
    where,
    data: { status: "PUBLISHED", version: { increment: 1 } },
  });
  if (result.count === 0) return false;

  const updated = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!updated) return false;

  await expireAnnouncementIfDue(prisma, announcementId);

  const afterPin = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!afterPin) return false;

  await emitAnnouncementRealtimeEvent(afterPin);
  await writeAnnouncementAudit(
    prisma,
    updated.createdById,
    announcementId,
    "PUBLISH",
    { status: "SCHEDULED" },
    { status: "PUBLISHED" },
  );
  announcementLog("info", "announcement.scheduled_published", {
    announcementId,
    source,
  });
  return true;
}

/**
 * When BullMQ is disabled: publish announcements whose scheduled time has passed.
 * Mirrors {@link import("./announcementExpiry.service.js").runAnnouncementExpiryFallbackScan}.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 */
export async function runAnnouncementPublishFallbackScan(prisma) {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      status: "SCHEDULED",
      publishedAt: { not: null, lte: now },
    },
    select: { id: true },
  });

  let published = 0;
  for (const { id } of rows) {
    try {
      if (await publishScheduledAnnouncementIfDue(prisma, id, { source: "fallback_scan" })) {
        published += 1;
      }
    } catch (e) {
      announcementLog("warn", "announcement.publish_fallback_row_failed", {
        announcementId: id,
        message: e?.message ?? String(e),
      });
    }
  }

  if (published > 0) {
    announcementLog("info", "announcement.publish_fallback_tick", { published, scanned: rows.length });
  }

  return { published, scanned: rows.length };
}
