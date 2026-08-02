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
import { assertCanManageAnnouncementById } from "../assertAnnouncementAuthor.js";



export async function handleAnnouncementTrackableLink(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const role = String(req.user?.role ?? "").toUpperCase();
    if (!["DEAN", "SUPER_ADMIN", "ACADEMIC_OFFICE", "OFFICE_STAFF", "ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const authorGate = await assertCanManageAnnouncementById(prisma, Number(req.user.sub), id);
    if (!authorGate.ok) {
      return res.status(authorGate.status).json({ message: authorGate.message });
    }
    const parsed = trackableLinkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", issues: parsed.error.issues });
    }
    const token = encodeAnnouncementRedirectToken({
      announcementId: id,
      targetUrl: parsed.data.url,
      userId: Number(req.user.sub),
    });
    if (!token) {
      return res.status(503).json({ message: "Link signing is not configured (ANNOUNCEMENT_LINK_REDIRECT_SECRET or JWT_SECRET)" });
    }
    const hostBase = `${req.protocol}://${req.get("host")}`;
    const base = String(process.env.PUBLIC_API_BASE_URL || hostBase).replace(/\/+$/, "");
    const trackedUrl = buildTrackedRedirectUrl(id, token, base);
    res.json({ trackedUrl });
  } catch (e) {
    res.status(500).json(apiErrorBody(e?.message || "Failed", null));
  }
}
