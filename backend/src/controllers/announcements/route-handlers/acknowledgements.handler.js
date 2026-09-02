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
import { assertCanManageAnnouncementById } from "../../../services/announcements/assertAnnouncementAuthor.js";



export async function handleAnnouncementAcknowledgementsList(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const role = String(req.user?.role ?? "").toUpperCase();
    if (!["DEAN", "SUPER_ADMIN", "ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const authorGate = await assertCanManageAnnouncementById(prisma, Number(req.user.sub), id);
    if (!authorGate.ok) {
      return res.status(authorGate.status).json({ message: authorGate.message });
    }
    const filter = String(req.query.filter ?? "all");
    if (String(req.query.format) === "csv") {
      const bulk = await listAnnouncementAcknowledgements(prisma, id, {
        page: 1,
        pageSize: 20000,
        filter,
      });
      if (bulk == null) return res.status(404).json({ message: "Announcement not found" });
      if (bulk.empty) {
        return res.status(400).json({ message: "Acknowledgements not required for this announcement" });
      }
      const header = ["userId", "full_name", "email", "number", "acknowledged", "acknowledgedAt"];
      const lines = [
        header.join(","),
        ...bulk.results.map((r) =>
          [r.userId, r.full_name, r.email, r.number, r.acknowledged, r.acknowledgedAt ?? ""]
            .map(csvEscapeCell)
            .join(","),
        ),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="announcement-${id}-acknowledgements.csv"`);
      return res.status(200).send(lines.join("\n"));
    }

    const { page, pageSize } = parsePaginationQuery(req.query, { defaultPageSize: 50, maxPageSize: 200 });
    const out = await listAnnouncementAcknowledgements(prisma, id, { page, pageSize, filter });
    if (out == null) return res.status(404).json({ message: "Announcement not found" });
    if (out.empty) {
      return res.status(400).json({ message: "Acknowledgements not required for this announcement" });
    }
    res.json(paginatedPayload({ total: out.total, page, pageSize, results: out.results }));
  } catch (e) {
    res.status(500).json(apiErrorBody(e?.message || "Failed", null));
  }
}
