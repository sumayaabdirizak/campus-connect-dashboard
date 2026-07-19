import { prisma } from "../../../../db/prisma.js";
import { z } from "zod";
import multer from "multer";
import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  getUnreadCount,
  isPrismaAnnouncementSchemaDriftError,
} from "../announcementVisibility.service.js";
import { findVisibleAnnouncementsBySearch } from "../announcementSearch.service.js";
import { parsePaginationQuery, paginatedPayload } from "../../../../utils/pagination.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { loadUserAnnouncementScope } from "../../../../utils/userAnnouncementScope.js";
import {
  toAnnouncementDto,
  announcementDtoPrismaInclude,
  announcementDtoPrismaIncludeLegacy,
  ANNOUNCEMENT_LIKE_EMOJI,
} from "../../dto/announcementDto.js";
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
} from "../announcementService.js";
import { findAnnouncementRecipientUserIds } from "../announcementRecipients.service.js";
import { sendAnnouncementSmsNotifications, redactPhone } from "../announcementSms.service.js";
import { countOverdueScheduledAnnouncements } from "../announcementJobs.service.js";
import {
  computeAnnouncementAnalytics,
  listAnnouncementAcknowledgements,
  invalidateAnnouncementAnalyticsCache,
} from "../announcementAnalytics.service.js";
import { commitUploadedFile } from "../../../../storage/objectStorage.js";
import {
  encodeAnnouncementRedirectToken,
  buildTrackedRedirectUrl,
} from "../announcementLinkRedirect.service.js";
import {
  loadAllVisibleDeadlineRows,
  buildCalendarDeadlinesIcs,
  isAnnouncementDeadlineAllDayUtc,
} from "../calendarDeadlines.service.js";
import { announcementLog } from "../../announcementLogger.js";
import { attachLikedByCurrentUser } from "../announcementReactions.service.js";
import { csvEscapeCell } from "../../../../utils/csv.js";
import {
  trackableLinkBodySchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  readBulkSchema,
  previewRecipientsSchema,
} from "../../validation/announcementSchemas.js";



export async function handleAnnouncementAcknowledge(req, res) {
  try {
    const announcementId = Number.parseInt(req.params.id, 10);
    const userId = Number(req.user.sub);
    if (!Number.isFinite(announcementId)) return res.status(400).json({ message: "Invalid id" });

    // Visibility check — only users who can see the announcement may ack it.
    const loaded = await loadUserAnnouncementScope(prisma, userId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    let visible;
    try {
      visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, buildVisibleAnnouncementsWhere(visibilityUser)] },
        select: { id: true, acknowledgementRequired: true, isActive: true, status: true },
      });
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, buildVisibleAnnouncementsWhereLegacy(visibilityUser)] },
        select: { id: true, acknowledgementRequired: true, isActive: true },
      });
    }
    if (!visible) return res.status(404).json({ message: "Announcement not found" });
    if (visible.isActive === false) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    if (!visible.acknowledgementRequired) {
      return res.status(400).json({ message: "Acknowledgement is not required for this announcement" });
    }

    await prisma.announcementAcknowledgement.upsert({
      where: {
        announcementId_userId: { announcementId, userId },
      },
      create: { announcementId, userId },
      update: { acknowledgedAt: new Date() },
    });
    await writeAnnouncementAudit(prisma, userId, announcementId, "ACK", null, {
      acknowledgedAt: new Date().toISOString(),
    });
    invalidateAnnouncementAnalyticsCache(announcementId);
    res.json({ success: true });
  } catch (error) {
    announcementLog("error", "announcement.acknowledge_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to acknowledge", null));
  }
}
