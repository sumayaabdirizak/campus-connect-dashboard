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



export async function handleAnnouncementCalendarDeadlines(req, res) {
  try {
    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const fromRaw = req.query.from != null ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86400000);
    const toRaw = req.query.to != null ? new Date(String(req.query.to)) : new Date(Date.now() + 60 * 86400000);
    if (Number.isNaN(fromRaw.getTime()) || Number.isNaN(toRaw.getTime())) {
      return res.status(400).json({ message: "Invalid from or to date" });
    }

    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const rows = await loadAllVisibleDeadlineRows(prisma, loaded, visibilityUser, fromRaw, toRaw);

    const results = rows.map((r) => ({
      kind: r.kind,
      id: r.id,
      title: r.title,
      deadlineAt: r.deadlineAt ? new Date(r.deadlineAt).toISOString() : null,
      deadlineAllDay: r.deadlineAt ? isAnnouncementDeadlineAllDayUtc(r.deadlineAt) : false,
      courseCode: r.courseCode ?? null,
      courseOfferingId: r.courseOfferingId ?? null,
      targetType: r.targetType ?? null,
      targeting: r.targeting ?? null,
    }));
    res.json({ results });
  } catch (error) {
    announcementLog("error", "announcement.calendar_deadlines_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to load calendar deadlines", null));
  }
}
