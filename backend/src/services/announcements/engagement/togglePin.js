import { prisma } from "../../../db/prisma.js";
import { loadUserAnnouncementScope } from "../../../utils/userAnnouncementScope.js";
import { canUserSeeAnnouncement } from "../announcementVisibility.service.js";
import { announcementLog } from "../announcementLogger.js";
import { emitAnnouncementUpdatedFanout } from "../announcementRealtime.service.js";
import {
  CREATE_ANNOUNCEMENT_ROLES,
  MAX_PINNED_PER_CREATOR,
} from "../announcementService.helpers.js";
import { writeAnnouncementAudit } from "../create/audit.js";
import { visibilityUserFromLoaded } from "./listSort.js";
import { assertAnnouncementAuthor } from "../assertAnnouncementAuthor.js";

const PIN_LOCK_CLASSID = 91011;
const PIN_LIMIT_EXCEEDED = Symbol("PIN_LIMIT_EXCEEDED");

export async function togglePin(announcementId, jwtUser) {
  const userId = Number(jwtUser.sub);
  const role = String(jwtUser.role);

  if (!CREATE_ANNOUNCEMENT_ROLES.has(role)) {
    return {
      ok: false,
      status: 403,
      message: "Only SUPER_ADMIN, ACADEMIC_OFFICE, DEAN, or OFFICE_STAFF may pin announcements",
    };
  }

  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) return { ok: false, status: 404, message: "User not found" };

  const visibilityUser = visibilityUserFromLoaded(loaded);
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  if (!announcement) return { ok: false, status: 404, message: "Announcement not found" };

  const authorGate = assertAnnouncementAuthor(userId, announcement);
  if (!authorGate.ok) return authorGate;

  if (!canUserSeeAnnouncement(visibilityUser, announcement)) {
    return { ok: false, status: 403, message: "Announcement is outside your visibility scope" };
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PIN_LOCK_CLASSID}::int4, ${announcement.createdById}::int4)`;
      const fresh = await tx.announcement.findUnique({
        where: { id: announcementId },
        select: { isPinned: true, createdById: true, isActive: true },
      });
      if (!fresh || fresh.isActive === false) throw new Error("ANNOUNCEMENT_GONE");

      const willPin = !fresh.isPinned;
      if (willPin) {
        const currentPinnedCount = await tx.announcement.count({
          where: {
            createdById: fresh.createdById,
            isPinned: true,
            isActive: true,
            id: { not: announcementId },
          },
        });
        announcementLog("info", "announcement.pin_toggle", {
          announcementId,
          role,
          userId,
          pinnedCount: currentPinnedCount,
          willPin,
        });
        if (currentPinnedCount >= MAX_PINNED_PER_CREATOR) throw PIN_LIMIT_EXCEEDED;
      } else {
        announcementLog("info", "announcement.pin_toggle", { announcementId, role, userId, willPin });
      }

      const row = await tx.announcement.update({
        where: { id: announcementId },
        data: { isPinned: willPin, version: { increment: 1 } },
      });
      await writeAnnouncementAudit(tx, userId, announcementId, "PIN_TOGGLE", { isPinned: fresh.isPinned }, {
        isPinned: row.isPinned,
      });
      return row;
    });
  } catch (err) {
    if (err === PIN_LIMIT_EXCEEDED) {
      return {
        ok: false,
        status: 400,
        message: `A creator can pin at most ${MAX_PINNED_PER_CREATOR} announcements`,
      };
    }
    if (err?.message === "ANNOUNCEMENT_GONE") {
      return { ok: false, status: 404, message: "Announcement not found" };
    }
    throw err;
  }

  await emitAnnouncementUpdatedFanout(updated);
  return { ok: true, announcement: { ...updated, reads: [] } };
}
