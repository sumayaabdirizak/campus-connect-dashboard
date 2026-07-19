import { prisma } from "../../../../db/prisma.js";
import { loadUserAnnouncementScope } from "../../../../utils/userAnnouncementScope.js";
import { canUserSeeAnnouncement } from "../announcementVisibility.service.js";
import { invalidateAnnouncementAnalyticsCache } from "../announcementAnalytics.service.js";
import { visibilityUserFromLoaded } from "./listSort.js";

export async function markAsRead(userId, announcementId) {
  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) return { ok: false, status: 404, message: "User not found" };

  const visibilityUser = visibilityUserFromLoaded(loaded);
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  if (!announcement) return { ok: false, status: 404, message: "Announcement not found" };

  if (!canUserSeeAnnouncement(visibilityUser, announcement)) {
    return { ok: false, status: 403, message: "Announcement is outside your visibility scope" };
  }

  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId } },
    create: { announcementId, userId },
    update: {},
  });
  invalidateAnnouncementAnalyticsCache(announcementId);
  return { ok: true };
}

export async function markAsReadBulk(userId, announcementIds) {
  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) return { ok: false, status: 404, message: "User not found" };

  const visibilityUser = visibilityUserFromLoaded(loaded);
  const ids = [...new Set(announcementIds.map((n) => Number(n)).filter((n) => Number.isFinite(n)))];
  if (ids.length === 0) return { ok: true, marked: [] };
  if (ids.length > 200) return { ok: false, status: 400, message: "Too many ids (max 200)" };

  const announcements = await prisma.announcement.findMany({
    where: { id: { in: ids } },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  const visibleIds = announcements
    .filter((a) => canUserSeeAnnouncement(visibilityUser, a))
    .map((a) => a.id);
  if (!visibleIds.length) return { ok: true, marked: [] };

  await prisma.announcementRead.createMany({
    data: visibleIds.map((announcementId) => ({ announcementId, userId })),
    skipDuplicates: true,
  });
  for (const aid of visibleIds) invalidateAnnouncementAnalyticsCache(aid);
  return { ok: true, marked: visibleIds };
}

/** @param {number} userId @param {number[]} announcementIds @returns {Promise<Set<number>>} */
export async function getReadAnnouncementIdSet(userId, announcementIds) {
  if (!announcementIds.length) return new Set();
  const rows = await prisma.announcementRead.findMany({
    where: { userId, announcementId: { in: announcementIds } },
    select: { announcementId: true },
  });
  return new Set(rows.map((r) => Number(r.announcementId)).filter((n) => Number.isFinite(n)));
}
