import express from "express";
import { z } from "zod";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import { requireActiveDiscussionMembership } from "../../../../features/discussions/discussionMembership.js";
import { reactionBodySchema } from "../../../../features/discussions/validation/groupDiscussionSchemas.js";
import { groupReactionsByEmoji } from "../shared.js";

const router = express.Router();

router.get("/groups/:groupId/messages/:messageId/reactions", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const rows = await prisma.discussionMessageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, full_name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ results: groupReactionsByEmoji(rows) });
  } catch (error) {
    console.error("GET reactions failed", error);
    return res.status(500).json(apiErrorBody("Failed to list reactions", null));
  }
});

router.post("/groups/:groupId/messages/:messageId/reactions", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const parsed = reactionBodySchema.parse(req.body ?? {});
    await prisma.discussionMessageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji: parsed.emoji } },
      create: { messageId, userId, emoji: parsed.emoji },
      update: {},
    });
    const rows = await prisma.discussionMessageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, full_name: true } } },
    });
    const summary = groupReactionsByEmoji(rows);
    const reactedMsg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId },
      select: { senderId: true },
    });
    const reactorRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true },
    });
    if (reactedMsg && reactedMsg.senderId !== userId) {
      await prisma.discussionNotification.create({
        data: {
          userId: reactedMsg.senderId,
          groupId,
          messageId,
          type: "REACTION",
          payload: {
            groupId,
            messageId,
            reactorId: userId,
            reactorName: reactorRow?.full_name ?? null,
            emoji: parsed.emoji,
          },
        },
      });
    }
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("reaction:update", {
        groupId,
        messageId,
        summary,
        emoji: parsed.emoji,
        userId,
        action: "add",
      });
    }
    return res.status(201).json({ ok: true, messageId, emoji: parsed.emoji, summary });
  } catch (error) {
    console.error("POST reaction failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to add reaction", null));
  }
});

router.delete("/groups/:groupId/messages/:messageId/reactions", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    const emoji = String(req.query.emoji ?? "").trim();
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    if (!emoji) {
      return res.status(400).json(apiErrorBody("emoji query parameter is required", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    await prisma.discussionMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    const rows = await prisma.discussionMessageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, full_name: true } } },
    });
    const summary = groupReactionsByEmoji(rows);
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("reaction:update", {
        groupId,
        messageId,
        summary,
        emoji,
        userId,
        action: "remove",
      });
    }
    return res.json({ ok: true, messageId, emoji, summary });
  } catch (error) {
    console.error("DELETE reaction failed", error);
    return res.status(500).json(apiErrorBody("Failed to remove reaction", null));
  }
});

export default router;
