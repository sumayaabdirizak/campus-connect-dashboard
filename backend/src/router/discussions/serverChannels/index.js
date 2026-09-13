/**
 * Channel CRUD and lifecycle routes.
 *
 *   GET    /channels/:channelId
 *   GET    /channels/:channelId/audit-log  (?cursor= — VIEW_AUDIT_LOG)
 *   GET    /channels/:channelId/members
 *   PATCH  /channels/:channelId  (name, topic — requires MANAGE_CHANNEL; e.g. Dean)
 *   POST   /channels/:channelId/archive
 *   DELETE /channels/:channelId/archive
 *   DELETE /channels/:channelId  (hard delete — archived only; MANAGE_CHANNEL + MANAGE_SERVER)
 */
import express from "express";
import getRoutes from "./routes/get.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import membersRoutes from "./routes/members.routes.js";
import patchRoutes from "./routes/patch.routes.js";
import archiveRoutes from "./routes/archive.routes.js";
import hardDeleteRoutes from "./routes/hardDelete.routes.js";

const router = express.Router();

router.use(getRoutes);
router.use(auditLogRoutes);
router.use(membersRoutes);
router.use(patchRoutes);
router.use(archiveRoutes);
router.use(hardDeleteRoutes);

export default router;
