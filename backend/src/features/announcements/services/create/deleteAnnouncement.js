import { prisma } from "../../../../db/prisma.js";
import { isPrismaAnnouncementSchemaDriftError } from "../announcementVisibility.service.js";
import { announcementLog } from "../../announcementLogger.js";
import { previewAnnouncementSnapshot } from "../../dto/announcementDto.js";
import { assertAnnouncementAuthor } from "../assertAnnouncementAuthor.js";

/**
 * Soft-deletes (archives) an announcement — author only.
 * @param {number} announcementId
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} jwtUser
 */
export async function deleteAnnouncement(announcementId, jwtUser) {
  const userId = Number(jwtUser.sub);

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  if (!announcement) {
    return { ok: false, status: 404, message: "Announcement not found" };
  }

  const authorGate = assertAnnouncementAuthor(userId, announcement);
  if (!authorGate.ok) {
    announcementLog("warn", "announcement.delete_not_author", {
      announcementId,
      actorUserId: userId,
      createdById: announcement.createdById,
    });
    return authorGate;
  }

  const beforeSnap = previewAnnouncementSnapshot(announcement);
  try {
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { isActive: false, status: "ARCHIVED" },
    });
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { isActive: false },
    });
  }
  return { ok: true, beforeSnap };
}
