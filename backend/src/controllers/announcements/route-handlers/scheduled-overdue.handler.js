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



export async function handleAnnouncementScheduledOverdue(req, res) {
  try {
    const thresholdSecRaw = Number(req.query.thresholdSec);
    const thresholdMs =
      Number.isFinite(thresholdSecRaw) && thresholdSecRaw > 0
        ? Math.trunc(thresholdSecRaw) * 1000
        : 10 * 60 * 1000;
    const count = await countOverdueScheduledAnnouncements(prisma, thresholdMs);
    res.json({
      count,
      thresholdMs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    announcementLog("error", "announcement.scheduled_overdue_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to compute overdue count", null));
  }
}
