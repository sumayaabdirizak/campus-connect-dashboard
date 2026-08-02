import express from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { ANNOUNCEMENT_MANAGER_ROLES } from "../../../../shared/roles.js";
import { validateZod } from "../../middleware/validateRequest.js";
import { announcementIdempotencyPost } from "../../middleware/announcementIdempotency.js";
import {
  announcementsCreateLimiter,
  announcementsReadBulkLimiter,
} from "../../middleware/announcementRateLimit.js";
import { announcementImageUpload } from "../../middleware/announcementUpload.js";
import { smsAuditListQuerySchema, ackListQuerySchema } from "../../validation/announcementSchemas.js";
import { handleAnnouncementList } from "../../services/announcements/announcementList.service.js";
import {
  handleAnnouncementUnreadCount,
  handleAnnouncementPreviewRecipients,
  handleAnnouncementMeDataExport,
  handleAnnouncementMeVisibility,
  handleAnnouncementCreate,
  handleAnnouncementSearch,
  handleAnnouncementCalendarDeadlines,
  handleAnnouncementScheduledOverdue,
  handleAnnouncementSmsAuditList,
  handleAnnouncementAnalytics,
  handleAnnouncementAcknowledgementsList,
  handleAnnouncementTrackableLink,
  handleAnnouncementAudit,
  handleAnnouncementAcknowledge,
  handleAnnouncementLike,
  handleAnnouncementReadBulk,
  handleAnnouncementDelete,
  handleAnnouncementGetById,
  handleAnnouncementPatch,
  handleAnnouncementPin,
  handleAnnouncementMarkRead,
} from "../../services/announcements/announcementRouteHandlers.js";

const router = express.Router();
const requireAnnouncementManager = requireRole(...ANNOUNCEMENT_MANAGER_ROLES);

router.get("/", handleAnnouncementList);
router.get("/unread-count", handleAnnouncementUnreadCount);
router.get("/preview-recipients", requireAnnouncementManager, handleAnnouncementPreviewRecipients);
router.get("/me/data-export", handleAnnouncementMeDataExport);
router.get("/me-visibility", handleAnnouncementMeVisibility);
router.post(
  "/",
  requireAnnouncementManager,
  announcementsCreateLimiter,
  announcementIdempotencyPost,
  announcementImageUpload.array("images", 10),
  handleAnnouncementCreate
);
router.get("/search", handleAnnouncementSearch);
router.get("/calendar-deadlines", handleAnnouncementCalendarDeadlines);
router.get("/admin/scheduled-overdue", requireAnnouncementManager, handleAnnouncementScheduledOverdue);
router.get(
  "/admin/sms-audit",
  requireRole("SUPER_ADMIN"),
  validateZod(smsAuditListQuerySchema, "query"),
  handleAnnouncementSmsAuditList
);
router.get("/:id/analytics", handleAnnouncementAnalytics);
router.get(
  "/:id/acknowledgements",
  validateZod(ackListQuerySchema, "query"),
  handleAnnouncementAcknowledgementsList
);
router.post("/:id/trackable-link", handleAnnouncementTrackableLink);
router.get("/:id/audit", handleAnnouncementAudit);
router.post("/:id/acknowledge", handleAnnouncementAcknowledge);
router.post("/:id/like", handleAnnouncementLike);
router.post("/read-bulk", announcementsReadBulkLimiter, handleAnnouncementReadBulk);
router.delete("/:id", requireAnnouncementManager, handleAnnouncementDelete);
router.get("/:id", handleAnnouncementGetById);
router.patch(
  "/:id",
  announcementImageUpload.array("images", 10),
  handleAnnouncementPatch
);
router.patch("/:id/pin", requireAnnouncementManager, handleAnnouncementPin);
router.post("/:id/read", handleAnnouncementMarkRead);

export default router;
