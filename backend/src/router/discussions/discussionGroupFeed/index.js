import express from "express";
import getMessagesRoutes from "./routes/getMessages.routes.js";
import postMessageRoutes from "./routes/postMessage.routes.js";

const router = express.Router();

router.use(getMessagesRoutes);
router.use(postMessageRoutes);

export default router;
