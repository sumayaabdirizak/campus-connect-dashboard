import { prisma } from "../../../../db/prisma.js";
import { isPrismaAnnouncementSchemaDriftError } from "../announcementVisibility.service.js";
import { announcementLog } from "../../announcementLogger.js";
import { previewAnnouncementSnapshot } from "../../dto/announcementDto.js";
import { DEAN_SCOPE_FORBIDDEN } from "../announcementService.helpers.js";

/**
 * Soft-deletes (archives) an announcement.
 * @param {number} announcementId
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} jwtUser
 */
export async function deleteAnnouncement(announcementId, jwtUser) {
  const userId = Number(jwtUser.sub);
  const role = String(jwtUser.role).toUpperCase();

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  if (!announcement) {
    return { ok: false, status: 404, message: "Announcement not found" };
  }

  if (role === "DEAN") {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId },
      select: { facultyId: true },
    });
    if (!deanProfile) {
      return { ok: false, status: 403, message: DEAN_SCOPE_FORBIDDEN };
    }
    const announcementFacultyIds = new Set();
    if (announcement.facultyId != null) announcementFacultyIds.add(announcement.facultyId);
    for (const t of announcement.targets ?? []) {
      if (String(t.scopeType).toUpperCase() === "FACULTY") {
        announcementFacultyIds.add(Number(t.scopeId));
      }
    }
    for (const fid of announcementFacultyIds) {
      if (fid !== deanProfile.facultyId) {
        announcementLog("warn", "announcement.dean_cross_faculty_delete_blocked", {
          announcementId,
          deanUserId: userId,
          deanFacultyId: deanProfile.facultyId,
          announcementFacultyId: fid,
        });
        return { ok: false, status: 403, message: DEAN_SCOPE_FORBIDDEN };
      }
    }
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
