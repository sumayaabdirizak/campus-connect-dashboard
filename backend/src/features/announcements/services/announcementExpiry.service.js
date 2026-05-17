import { emitAnnouncementUpdatedFanout } from "./announcementRealtime.service.js";
import { writeAnnouncementAudit } from "./announcementService.js";
import { announcementLog } from "../announcementLogger.js";

/**
 * End of "pin to top" window: `expiresAt` is the pin-until instant (not feed hide).
 * Clears pin and `expiresAt` for **PUBLISHED** or **SCHEDULED** rows (scheduled posts can
 * have a pin-until before publish; the worker must clear pin even while still SCHEDULED).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} announcementId
 * @returns {Promise<boolean>} true if a row was updated
 */
export async function expireAnnouncementIfDue(prisma, announcementId) {
  const now = new Date();
  const before = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { expiresAt: true, isPinned: true, status: true },
  });
  const result = await prisma.announcement.updateMany({
    where: {
      id: announcementId,
      status: { in: ["PUBLISHED", "SCHEDULED"] },
      isActive: true,
      expiresAt: { not: null, lte: now },
    },
    data: { isPinned: false, expiresAt: null, version: { increment: 1 } },
  });
  if (result.count === 0) return false;
  const updated = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!updated) return false;
  await emitAnnouncementUpdatedFanout(updated);
  await writeAnnouncementAudit(prisma, null, announcementId, "PIN_WINDOW_END", before ?? {}, {
    expiresAt: null,
    isPinned: false,
  });
  return true;
}

/**
 * Fallback when BullMQ / Redis is off: clear timed pins for rows whose `expiresAt` has passed.
 * @param {import("@prisma/client").PrismaClient} prisma
 */
export async function runAnnouncementExpiryFallbackScan(prisma) {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      status: { in: ["PUBLISHED", "SCHEDULED"] },
      isActive: true,
      expiresAt: { not: null, lte: now },
    },
    select: { id: true },
  });
  let unpinned = 0;
  for (const { id } of rows) {
    try {
      if (await expireAnnouncementIfDue(prisma, id)) unpinned += 1;
    } catch (e) {
      announcementLog("warn", "announcement.expire_fallback_row_failed", {
        announcementId: id,
        message: e?.message ?? String(e),
      });
    }
  }
  if (unpinned > 0) {
    announcementLog("info", "announcement.expire_fallback_tick", { unpinned, scanned: rows.length });
  }
  return { unpinned, scanned: rows.length };
}
