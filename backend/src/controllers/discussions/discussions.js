/**
 * Legacy group-scoped discussion REST endpoints plus mounts for
 * group DMs and Discord-style servers.
 *
 * Sub-routers split by concern (me, attachments, group core/feed/pins/messages/e2e, maintenance).
 */

import express from "express";
import discussionMeRouter from "./discussionMe.routes.js";
import discussionAttachmentsRouter from "./discussionAttachments.routes.js";
import discussionGroupCoreRouter from "./discussionGroupCore.routes.js";
import discussionGroupFeedRouter from "./discussionGroupFeed.routes.js";
import discussionGroupPinsRouter from "./discussionGroupPins.routes.js";
import discussionGroupMessagesRouter from "./discussionGroupMessages.routes.js";
import discussionGroupE2ERouter from "./discussionGroupE2E.routes.js";
import discussionMaintenanceRouter from "./discussionMaintenance.routes.js";
import groupDmsRouter from "./groupDms.js";
import serversRouter from "./servers.js";

const router = express.Router();

router.use(discussionMeRouter);
router.use(discussionAttachmentsRouter);
router.use(discussionGroupCoreRouter);
router.use(discussionGroupFeedRouter);
router.use(discussionGroupPinsRouter);
router.use(discussionGroupMessagesRouter);
router.use(discussionGroupE2ERouter);
router.use(groupDmsRouter);
router.use(serversRouter);
router.use(discussionMaintenanceRouter);

export default router;
