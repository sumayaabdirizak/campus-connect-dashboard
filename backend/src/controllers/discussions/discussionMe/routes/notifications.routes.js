import express from "express";
import { z } from "zod";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { buildUnreadSocketPayload } from "../../../../features/discussions/buildUnreadPayload.js";
import { enrichDiscussionNotificationsForApi } from "../../../../features/discussions/enrichDiscussionNotifications.js";
import {
  markReadSchema,
  notificationsQuerySchema,
} from "../../../../features/discussions/validation/groupDiscussionSchemas.js";

const router = express.Router();

router.get("/me/notifications", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const parsed = notificationsQuerySchema.parse(req.query ?? {});
    const where = {
      userId,
      ...(parsed.unreadOnly ? { readAt: null } : {}),
      ...(parsed.groupId ? { groupId: parsed.groupId } : {}),
    };
    const notifications = await prisma.discussionNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parsed.limit,
    });
    const enriched = await enrichDiscussionNotificationsForApi(req, userId, notifications);
    return res.json({ results: enriched });
  } catch (error) {
    console.error("GET /discussions/me/notifications failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to fetch notifications", null));
  }
});

router.get("/me/notifications/unread-count", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const payload = await buildUnreadSocketPayload(userId);
    return res.json(payload);
  } catch (error) {
    console.error("GET /discussions/me/notifications/unread-count failed", error);
    return res.status(500).json(apiErrorBody("Failed to fetch unread counts", null));
  }
});

router.patch("/me/notifications/read", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const parsed = markReadSchema.parse(req.body ?? {});

    const where = { userId };
    if (parsed.notificationIds?.length) where.id = { in: parsed.notificationIds };
    if (parsed.groupId) where.groupId = parsed.groupId;
    if (parsed.groupDmId) {
      where.groupId = null;
      where.payload = { path: ["groupDmId"], equals: parsed.groupDmId };
    }
    if (parsed.upToCreatedAt) where.createdAt = { lte: new Date(parsed.upToCreatedAt) };
    if (
      parsed.markAll !== true &&
      !parsed.groupId &&
      !parsed.groupDmId &&
      !(parsed.notificationIds?.length)
    ) {
      return res
        .status(400)
        .json(apiErrorBody("Provide notificationIds, groupId, groupDmId, or markAll=true", null));
    }

    const result = await prisma.discussionNotification.updateMany({
      where: { ...where, readAt: null },
      data: { readAt: new Date() },
    });
    return res.json({ updatedCount: result.count });
  } catch (error) {
    console.error("PATCH /discussions/me/notifications/read failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to mark notifications as read", null));
  }
});

export default router;
