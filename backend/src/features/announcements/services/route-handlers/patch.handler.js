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



export async function handleAnnouncementPatch(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }
    const normalizedTargetRoles = req.body?.targetRoles
      ? normalizeTargetRoles(
          Array.isArray(req.body.targetRoles) ? req.body.targetRoles : [req.body.targetRoles],
        )
      : undefined;
    const parsed = updateAnnouncementSchema.parse({
      ...req.body,
      ...(normalizedTargetRoles ? { targetRoles: normalizedTargetRoles } : {}),
      publishedAt: req.body?.publishedAt,
      expiresAt: req.body?.expiresAt,
      deadlineAt: req.body?.deadlineAt,
    });
    const userId = Number(req.user.sub);
    const result = await updateAnnouncement(id, req.user, parsed);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    const [patchedWithLiked] = await attachLikedByCurrentUser(
      result.announcement ? [result.announcement] : [],
      userId,
    );
    return res.json(toAnnouncementDto(patchedWithLiked ?? result.announcement, userId));
  } catch (error) {
    announcementLog("error", "announcement.patch_failed", { message: error?.message ?? String(error) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to update announcement", null));
  }
}
