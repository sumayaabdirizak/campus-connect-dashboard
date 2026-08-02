import { prisma } from "../../../db/prisma.js";
import { z } from "zod";
import multer from "multer";
import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  getUnreadCount,
  isPrismaAnnouncementSchemaDriftError,
} from "../../../services/announcements/announcementVisibility.service.js";
import { findVisibleAnnouncementsBySearch } from "../../../services/announcements/announcementSearch.service.js";
import { parsePaginationQuery, paginatedPayload } from "../../../utils/pagination.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { loadUserAnnouncementScope } from "../../../utils/userAnnouncementScope.js";
import {
  toAnnouncementDto,
  announcementDtoPrismaInclude,
  announcementDtoPrismaIncludeLegacy,
  ANNOUNCEMENT_LIKE_EMOJI,
} from "../../../services/announcements/dto/announcementDto.js";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePin,
  markAsRead,
  markAsReadBulk,
  getReadAnnouncementIdSet,
  normalizeTargetRoles,
  visibilityUserFromLoaded,
  writeAnnouncementAudit,
  sortAnnouncementsForList,
} from "../../../services/announcements/announcementService.js";
import { findAnnouncementRecipientUserIds } from "../../../services/announcements/announcementRecipients.service.js";
import { sendAnnouncementSmsNotifications, redactPhone } from "../../../services/announcements/announcementSms.service.js";
import { countOverdueScheduledAnnouncements } from "../../../services/announcements/announcementJobs.service.js";
import {
  computeAnnouncementAnalytics,
  listAnnouncementAcknowledgements,
  invalidateAnnouncementAnalyticsCache,
} from "../../../services/announcements/announcementAnalytics.service.js";
import { commitUploadedFile } from "../../../storage/objectStorage.js";
import {
  encodeAnnouncementRedirectToken,
  buildTrackedRedirectUrl,
} from "../../../services/announcements/announcementLinkRedirect.service.js";
import {
  loadAllVisibleDeadlineRows,
  isAnnouncementDeadlineAllDayUtc,
} from "../../../services/announcements/calendarDeadlines.service.js";
import { announcementLog } from "../../../services/announcements/announcementLogger.js";
import { attachLikedByCurrentUser } from "../../../services/announcements/announcementReactions.service.js";
import { csvEscapeCell } from "../../../utils/csv.js";
import {
  trackableLinkBodySchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  readBulkSchema,
  previewRecipientsSchema,
} from "../../../validation/announcementSchemas.js";



export async function handleAnnouncementMeVisibility(req, res) {
  try {
    const currentUserId = Number(req.user.sub);
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    // Dean + faculty Dean's Office staff — primary faculty for create-dialog reach.
    const roleUpper = String(loaded.role || "").toUpperCase();
    const facultyPublisher =
      (roleUpper === "DEAN" || roleUpper === "OFFICE_STAFF") && loaded.facultyIds?.length;
    const deanPrimaryFacultyId = facultyPublisher ? loaded.facultyIds[0] : null;
    res.json({ visibilityUser, deanPrimaryFacultyId });
  } catch (error) {
    announcementLog("error", "announcement.me_visibility_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to load visibility scope", null));
  }
}
