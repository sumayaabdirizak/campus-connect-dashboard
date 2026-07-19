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



export async function handleAnnouncementMeDataExport(req, res) {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }

    const [reads, acknowledgements, comments, reactions, audits] = await Promise.all([
      prisma.announcementRead.findMany({
        where: { userId },
        select: { announcementId: true, readAt: true, expiresAt: true },
      }),
      prisma.announcementAcknowledgement.findMany({
        where: { userId },
        select: { announcementId: true, acknowledgedAt: true },
      }),
      prisma.announcementComment.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          announcementId: true,
          bodyMarkdown: true,
          parentId: true,
          createdAt: true,
          deletedAt: true,
        },
      }),
      prisma.announcementReaction.findMany({
        where: { userId },
        select: { announcementId: true, emoji: true },
      }),
      prisma.announcementAudit
        .findMany({
          where: { actorId: userId },
          select: {
            id: true,
            announcementId: true,
            action: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1000,
        })
        .catch(() => []),
    ]);

    res.set("Content-Disposition", `attachment; filename="announcements-data-${userId}.json"`);
    res.json({
      generatedAt: new Date().toISOString(),
      userId,
      reads,
      acknowledgements,
      comments,
      reactions,
      audits,
    });
  } catch (error) {
    announcementLog("error", "announcement.data_export_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to export data", null));
  }
}
