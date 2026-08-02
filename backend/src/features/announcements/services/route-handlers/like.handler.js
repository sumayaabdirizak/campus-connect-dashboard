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



export async function handleAnnouncementLike(req, res) {
  try {
    const announcementId = Number.parseInt(req.params.id, 10);
    const userId = Number(req.user.sub);
    if (!Number.isFinite(announcementId)) return res.status(400).json({ message: "Invalid id" });
    const loaded = await loadUserAnnouncementScope(prisma, userId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    let visible;
    try {
      visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, buildVisibleAnnouncementsWhere(visibilityUser)] },
        select: { id: true },
      });
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, buildVisibleAnnouncementsWhereLegacy(visibilityUser)] },
        select: { id: true },
      });
    }
    if (!visible) return res.status(404).json({ message: "Announcement not found" });

    // Toggle the like. We must NOT drive this with a try/create + catch-P2002,
    // because in PostgreSQL a failed statement inside a transaction aborts the
    // whole transaction (`25P02`), so the follow-up delete/count would error
    // out — that's exactly why "unlike" was returning a 500. Instead, delete
    // first (idempotent: removes 0 rows without throwing), and only insert when
    // nothing existed. `deleteMany.count` tells us which branch we were in, all
    // without ever raising inside the transaction. The frontend `busy` guard
    // serialises a user's own clicks, so the create branch won't race itself.
    const { likes, likedByCurrentUser } = await prisma.$transaction(async (tx) => {
      const removed = await tx.announcementReaction.deleteMany({
        where: { announcementId, userId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
      });
      let liked;
      if (removed.count > 0) {
        // A like existed and we just cleared it — toggled off.
        liked = false;
      } else {
        await tx.announcementReaction.create({
          data: { announcementId, userId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
        });
        liked = true;
      }
      const count = await tx.announcementReaction.count({
        where: { announcementId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
      });
      return { likes: count, likedByCurrentUser: liked };
    });
    invalidateAnnouncementAnalyticsCache(announcementId);
    res.json({ likes, likedByCurrentUser });
  } catch (error) {
    announcementLog("error", "announcement.like_toggle_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to toggle like", null));
  }
}
