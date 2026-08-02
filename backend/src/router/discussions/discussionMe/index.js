import express from "express";
import muteRoutes from "./routes/mute.routes.js";
import workspacesRoutes from "./routes/workspaces.routes.js";
import groupsRoutes from "./routes/groups.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import e2eDevicesRoutes from "./routes/e2eDevices.routes.js";

const router = express.Router();

router.use(muteRoutes);
router.use(workspacesRoutes);
router.use(groupsRoutes);
router.use(notificationsRoutes);
router.use(e2eDevicesRoutes);

export default router;
