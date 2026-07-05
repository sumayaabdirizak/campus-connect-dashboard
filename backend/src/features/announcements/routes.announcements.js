import express from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { validateQuery } from "../../middleware/validateRequest.js";
import { announcementIdempotencyPost } from "./middleware/announcementIdempotency.js";
import {
  announcementsCreateLimiter,
  announcementsReadBulkLimiter,
} from "./middleware/announcementRateLimit.js";
import { announcementImageUpload } from "./middleware/announcementUpload.js";
import { smsAuditListQuerySchema, ackListQuerySchema } from "./validation/announcementSchemas.js";
import { handleAnnouncementList } from "./services/announcementList.service.js";
import {
  handleAnnouncementUnreadCount,
  handleAnnouncementPreviewRecipients,
  handleAnnouncementMeDataExport,
  handleAnnouncementMeVisibility,
  handleAnnouncementCreate,
  handleAnnouncementSearch,
  handleAnnouncementCalendarDeadlinesIcs,
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
} from "./services/announcementRouteHandlers.js";

const router = express.Router();

router.get("/", handleAnnouncementList);
router.get("/unread-count", handleAnnouncementUnreadCount);
router.get("/preview-recipients", requireRole("SUPER_ADMIN", "DEAN"), handleAnnouncementPreviewRecipients);
router.get("/me/data-export", handleAnnouncementMeDataExport);
router.get("/me-visibility", handleAnnouncementMeVisibility);
router.post(
  "/",
  requireRole("SUPER_ADMIN", "DEAN"),
  announcementsCreateLimiter,
  announcementIdempotencyPost,
  announcementImageUpload.array("images", 10),
  handleAnnouncementCreate
);
router.get("/search", handleAnnouncementSearch);
router.get("/calendar-deadlines.ics", handleAnnouncementCalendarDeadlinesIcs);
router.get("/calendar-deadlines", handleAnnouncementCalendarDeadlines);
router.get("/admin/scheduled-overdue", requireRole("SUPER_ADMIN", "DEAN"), handleAnnouncementScheduledOverdue);
router.get(
  "/admin/sms-audit",
  requireRole("SUPER_ADMIN"),
  validateQuery(smsAuditListQuerySchema),
  handleAnnouncementSmsAuditList
);
router.get("/:id/analytics", handleAnnouncementAnalytics);
router.get(
  "/:id/acknowledgements",
  validateQuery(ackListQuerySchema),
  handleAnnouncementAcknowledgementsList
);
router.post("/:id/trackable-link", handleAnnouncementTrackableLink);
router.get("/:id/audit", handleAnnouncementAudit);
router.post("/:id/acknowledge", handleAnnouncementAcknowledge);
router.post("/:id/like", handleAnnouncementLike);
router.post("/read-bulk", announcementsReadBulkLimiter, handleAnnouncementReadBulk);
router.delete("/:id", requireRole("SUPER_ADMIN", "DEAN"), handleAnnouncementDelete);
router.get("/:id", handleAnnouncementGetById);
router.patch("/:id", handleAnnouncementPatch);
router.patch("/:id/pin", requireRole("SUPER_ADMIN", "DEAN"), handleAnnouncementPin);
router.post("/:id/read", handleAnnouncementMarkRead);

export default router;
