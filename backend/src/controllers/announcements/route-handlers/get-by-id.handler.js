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



export async function handleAnnouncementGetById(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const currentUserId = Number(req.user.sub);

    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);

    const detailInclude = {
      reads: {
        where: { userId: currentUserId },
        select: { userId: true },
      },
    };
    let announcement;
    try {
      announcement = await prisma.announcement.findFirst({
        where: { AND: [{ id }, buildVisibleAnnouncementsWhere(visibilityUser)] },
        include: {
          ...announcementDtoPrismaInclude,
          ...detailInclude,
        },
      });
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      announcement = await prisma.announcement.findFirst({
        where: { AND: [{ id }, buildVisibleAnnouncementsWhereLegacy(visibilityUser)] },
        include: {
          ...announcementDtoPrismaIncludeLegacy,
          ...detailInclude,
        },
      });
    }

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const likedRow = await prisma.announcementReaction.findUnique({
      where: {
        announcementId_userId_emoji: {
          announcementId: id,
          userId: currentUserId,
          emoji: ANNOUNCEMENT_LIKE_EMOJI,
        },
      },
    });
    let ackRow = null;
    if (announcement.acknowledgementRequired) {
      ackRow = await prisma.announcementAcknowledgement.findUnique({
        where: {
          announcementId_userId: { announcementId: id, userId: currentUserId },
        },
      });
    }
    res.json(
      toAnnouncementDto(
        {
          ...announcement,
          _likedByCurrentUser: Boolean(likedRow),
          _acknowledgedByCurrentUser: Boolean(ackRow),
        },
        currentUserId,
      ),
    );
  } catch (error) {
    announcementLog("error", "announcement.detail_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to fetch announcement", null));
  }
}
