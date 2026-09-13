import { prisma } from "../../../db/prisma.js";
import { loadUserAnnouncementScope } from "../../../utils/userAnnouncementScope.js";
import { canUserSeeAnnouncement } from "../announcementVisibility.service.js";
import { previewAnnouncementSnapshot } from "../dto/announcementDto.js";
import { visibilityUserFromLoaded } from "../engagement/listSort.js";
import { assertAnnouncementAuthor } from "../assertAnnouncementAuthor.js";

/**
 * Load announcement for update — author only.
 * @param {number} announcementId
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} jwtUser
 */
export async function loadAnnouncementForUpdate(announcementId, jwtUser) {
  const userId = Number(jwtUser.sub);
  const role = String(jwtUser.role).toUpperCase();
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  if (!announcement) {
    return { ok: false, status: 404, message: "Announcement not found" };
  }

  const authorGate = assertAnnouncementAuthor(userId, announcement);
  if (!authorGate.ok) return authorGate;

  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) return { ok: false, status: 404, message: "User not found" };
  const visibilityUser = visibilityUserFromLoaded(loaded);
  if (!canUserSeeAnnouncement(visibilityUser, announcement)) {
    return { ok: false, status: 403, message: "Announcement is outside your visibility scope" };
  }

  return {
    ok: true,
    userId,
    role,
    announcement,
    loaded,
    beforeSnap: previewAnnouncementSnapshot(announcement),
  };
}
