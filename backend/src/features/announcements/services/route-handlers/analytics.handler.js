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



export async function handleAnnouncementAnalytics(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const role = String(req.user?.role ?? "").toUpperCase();
    if (!["DEAN", "SUPER_ADMIN", "ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const forceRefresh =
      req.query.refresh === "1" ||
      String(req.query.refresh ?? "").toLowerCase() === "true";
    const data = await computeAnnouncementAnalytics(prisma, id, { forceRefresh });
    if (!data) return res.status(404).json({ message: "Announcement not found" });
    res.json(data);
  } catch (e) {
    announcementLog("error", "announcement.analytics_failed", {
      message: e?.message ?? String(e),
      code: e?.code,
    });
    res.status(500).json(apiErrorBody(e?.message || "Failed", null));
  }
}
