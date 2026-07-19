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



export async function handleAnnouncementSearch(req, res) {
  try {
    /** @deprecated Prefer `GET /api/announcements?q=` (and optional filters). */
    res.set("Deprecation", "true");
    res.set("Link", '</api/announcements>; rel="alternate"');
    res.set("Warning", '299 - "Deprecated: use GET /api/announcements?q=<term>"');

    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      return res.json(paginatedPayload({ total: 0, page: 1, pageSize: 20, results: [] }));
    }
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    let announcements;
    try {
      announcements = await findVisibleAnnouncementsBySearch(prisma, {
        visibilityUser,
        q,
        take: limit,
        modernInclude: announcementDtoPrismaInclude,
        legacyInclude: announcementDtoPrismaIncludeLegacy,
      });
    } catch (err) {
      announcementLog("warn", "announcement.search_deprecated_failed", {
        message: err?.message ?? String(err),
      });
      return res.json(paginatedPayload({ total: 0, page: 1, pageSize: limit, results: [] }));
    }

    announcements = await attachLikedByCurrentUser(announcements, currentUserId);
    const readSet = await getReadAnnouncementIdSet(
      currentUserId,
      announcements.map((a) => a.id),
    );
    const withReads = announcements.map((a) => ({
      ...a,
      reads: readSet.has(a.id) ? [{ userId: currentUserId }] : [],
    }));
    const mapped = sortAnnouncementsForList(withReads, currentUserId).map((a) =>
      toAnnouncementDto({ ...a, targetRoles: a.targetRoles ?? [] }, currentUserId),
    );
    res.set("X-Total-Count", String(mapped.length));
    return res.json(paginatedPayload({ total: mapped.length, page: 1, pageSize: limit, results: mapped }));
  } catch (e) {
    announcementLog("error", "announcement.search_deprecated_error", { message: e?.message ?? String(e) });
    return res.json(paginatedPayload({ total: 0, page: 1, pageSize: 20, results: [] }));
  }
}
