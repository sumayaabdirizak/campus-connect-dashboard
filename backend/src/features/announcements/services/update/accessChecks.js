import { prisma } from "../../../../db/prisma.js";
import { loadUserAnnouncementScope } from "../../../../utils/userAnnouncementScope.js";
import { canUserSeeAnnouncement } from "../announcementVisibility.service.js";
import { announcementLog } from "../../announcementLogger.js";
import { previewAnnouncementSnapshot } from "../../dto/announcementDto.js";
import { DEAN_SCOPE_FORBIDDEN } from "../announcementService.helpers.js";
import { visibilityUserFromLoaded } from "../engagement/listSort.js";

/**
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

  const isPrivileged = role === "SUPER_ADMIN" || role === "ADMIN" || role === "DEAN";
  if (!isPrivileged && announcement.createdById !== userId) {
    return { ok: false, status: 403, message: "You do not have permission to edit this announcement" };
  }

  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) return { ok: false, status: 404, message: "User not found" };
  const visibilityUser = visibilityUserFromLoaded(loaded);
  if (!canUserSeeAnnouncement(visibilityUser, announcement) && !isPrivileged) {
    return { ok: false, status: 403, message: "Announcement is outside your visibility scope" };
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
        announcementLog("warn", "announcement.dean_cross_faculty_edit_blocked", {
          announcementId,
          deanUserId: userId,
          deanFacultyId: deanProfile.facultyId,
          announcementFacultyId: fid,
        });
        return { ok: false, status: 403, message: DEAN_SCOPE_FORBIDDEN };
      }
    }
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
