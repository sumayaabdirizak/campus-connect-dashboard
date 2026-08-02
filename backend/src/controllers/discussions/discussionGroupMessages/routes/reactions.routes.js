import express from "express";
import { z } from "zod";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import { requireActiveDiscussionMembership } from "../../../../services/discussions/discussionMembership.js";
import { reactionBodySchema } from "../../../../validation/groupDiscussionSchemas.js";
import { groupReactionsByEmoji } from "../shared.js";
import { resolveServerRow } from "../../serverShared.js";
import { resolveMessageRow } from "../../messageShared.js";

const router = express.Router();

router.get("/groups/:groupId/messages/:messageId/reactions", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupRow = await resolveServerRow(req.params.groupId);
    if (!groupRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const groupId = groupRow.id;
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await resolveMessageRow(req.params.messageId, { groupId, deletedAt: null });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const messageId = msg.id;
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
    const userId = Number(req.user?.sub);
    const groupRow = await resolveServerRow(req.params.groupId);
    if (!groupRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const groupId = groupRow.id;
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await resolveMessageRow(req.params.messageId, { groupId, deletedAt: null });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const messageId = msg.id;
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
            groupId: groupRow.publicId,
            messageId: msg.publicId,
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
        groupId: groupRow.publicId,
        messageId: msg.publicId,
        summary,
        emoji: parsed.emoji,
        userId,
        action: "add",
      });
    }
    return res.status(201).json({ ok: true, messageId: msg.publicId, emoji: parsed.emoji, summary });
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
    const userId = Number(req.user?.sub);
    const emoji = String(req.query.emoji ?? "").trim();
    const groupRow = await resolveServerRow(req.params.groupId);
    if (!groupRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const groupId = groupRow.id;
    if (!emoji) {
      return res.status(400).json(apiErrorBody("emoji query parameter is required", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await resolveMessageRow(req.params.messageId, { groupId, deletedAt: null });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const messageId = msg.id;
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
        groupId: groupRow.publicId,
        messageId: msg.publicId,
        summary,
        emoji,
        userId,
        action: "remove",
      });
    }
    return res.json({ ok: true, messageId: msg.publicId, emoji, summary });
  } catch (error) {
    console.error("DELETE reaction failed", error);
    return res.status(500).json(apiErrorBody("Failed to remove reaction", null));
  }
});

export default router;
