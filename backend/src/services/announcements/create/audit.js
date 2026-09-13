import { announcementLog } from "../announcementLogger.js";

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} db
 * @param {number} actorId
 * @param {number} announcementId
 * @param {string} action
 * @param {unknown} [before]
 * @param {unknown} [after]
 */
export async function writeAnnouncementAudit(db, actorId, announcementId, action, before, after) {
  try {
    await db.announcementAudit.create({
      data: {
        announcementId,
        actorId,
        action,
        before: before === undefined ? undefined : JSON.parse(JSON.stringify(before)),
        after: after === undefined ? undefined : JSON.parse(JSON.stringify(after)),
      },
    });
  } catch (err) {
    announcementLog("warn", "announcement.audit_skip", {
      announcementId,
      message: err?.message ?? String(err),
    });
  }
}

/**
 * @param {string} prevStatus
 * @param {string} nextStatus
 * @param {{ forceDraftFromClearSchedule?: boolean }} opts
 */
export function resolveAnnouncementUpdateAuditAction(prevStatus, nextStatus, opts = {}) {
  const prev = String(prevStatus ?? "").toUpperCase();
  const next = String(nextStatus ?? "").toUpperCase();
  if (opts.forceDraftFromClearSchedule) return "EDIT";
  if (prev === next) return "EDIT";
  if (next === "ARCHIVED") return "DELETE";
  if (next === "EXPIRED") return "EXPIRE";
  if (next === "PUBLISHED" && (prev === "DRAFT" || prev === "SCHEDULED")) return "PUBLISH";
  if (next === "SCHEDULED") return "SCHEDULE";
  return "EDIT";
}
