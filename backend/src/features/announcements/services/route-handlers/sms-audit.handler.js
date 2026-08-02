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



export async function handleAnnouncementSmsAuditList(req, res) {
  try {
    const { page, pageSize, skip } = parsePaginationQuery(req.query, { defaultPageSize: 20, maxPageSize: 100 });
    const where = {};
    if (req.query.userId != null) where.userId = Number(req.query.userId);
    if (req.query.announcementId != null) where.announcementId = Number(req.query.announcementId);

    const dateFrom = req.query.dateFrom != null ? String(req.query.dateFrom).trim() : "";
    const dateTo = req.query.dateTo != null ? String(req.query.dateTo).trim() : "";
    if (dateFrom || dateTo) {
      const sentAt = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json(apiErrorBody("Invalid dateFrom", null));
        }
        sentAt.gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json(apiErrorBody("Invalid dateTo", null));
        }
        sentAt.lte = d;
      }
      where.sentAt = sentAt;
    }

    const [rows, total] = await Promise.all([
      prisma.smsAuditLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          announcementId: true,
          phoneNumber: true,
          status: true,
          reason: true,
          sentAt: true,
          announcement: { select: { id: true, title: true } },
        },
      }),
      prisma.smsAuditLog.count({ where }),
    ]);

    const results = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      announcementId: r.announcementId,
      announcementTitle: r.announcement?.title ?? null,
      phoneNumber: redactPhone(r.phoneNumber),
      status: r.status,
      reason: r.reason,
      sentAt: r.sentAt.toISOString(),
    }));

    res.json(paginatedPayload({ total, page, pageSize, results }));
  } catch (error) {
    announcementLog("error", "announcement.sms_audit_list_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to load SMS audit log", null));
  }
}
