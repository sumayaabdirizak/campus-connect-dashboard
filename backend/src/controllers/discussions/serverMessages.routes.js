import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import {
  PERMISSION_BITS,
  computeChannelPermissions,
  hasPermission,
} from "../../features/discussions/permissions.js";
import { assertMessageReactionAllowed } from "../../features/discussions/messageAccess.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";
import {
  loadReactionsForMessage,
  emitReactionSocket,
} from "../../features/discussions/messageReactions.js";
import {
  serverReactionBodySchema,
  editChannelMessageSchema,
} from "../../features/discussions/validation/serverSchemas.js";

const router = express.Router();

router.patch("/messages/:messageId", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    const parseResult = editChannelMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parseResult.error.issues));
    }
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!message) return res.status(404).json(apiErrorBody("Message not found", null));
    if (message.deletedAt) {
      return res.status(410).json(apiErrorBody("Message deleted", null));
    }
    if (message.senderId !== userId) {
      return res.status(403).json(apiErrorBody("Cannot edit other users' messages", null));
    }

    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: { content: parseResult.data.content ?? null, editedAt: new Date() },
    });

    try {
      const io = getIo();
      if (io && message.channelId) {
        io.to(`channel:${message.channelId}`).emit("message:edit", { message: updated });
      }
    } catch (emitErr) {
      console.warn("Socket emit failed for message:edit", emitErr?.message);
    }
    return res.json({ message: updated });
  } catch (error) {
    console.error("PATCH /discussions/messages/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to edit message", null));
  }
});

router.delete("/messages/:messageId", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!message) return res.status(404).json(apiErrorBody("Message not found", null));
    if (message.deletedAt) return res.json({ message });

    const isAuthor = message.senderId === userId;
    if (!isAuthor) {
      if (!message.channelId) return res.status(403).json(apiErrorBody("Forbidden", null));
      const perms = await computeChannelPermissions({ userId, channelId: message.channelId });
      if (!hasPermission(perms, PERMISSION_BITS.MANAGE_MESSAGES)) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
    }
    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
    try {
      const io = getIo();
      if (io && message.channelId) {
        io.to(`channel:${message.channelId}`).emit("message:delete", { messageId });
      }
    } catch (emitErr) {
      console.warn("Socket emit failed for message:delete", emitErr?.message);
    }
    return res.json({ message: updated });
  } catch (error) {
    console.error("DELETE /discussions/messages/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to delete message", null));
  }
});

router.get("/messages/:messageId/reactions", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    const reactions = await loadReactionsForMessage(messageId);
    return res.json({ reactions });
  } catch (error) {
    console.error("GET /discussions/messages/:messageId/reactions failed", error);
    return res.status(500).json(apiErrorBody("Failed to list reactions", null));
  }
});

router.delete("/messages/:messageId/reactions/:emoji", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    let emoji;
    try {
      emoji = decodeURIComponent(String(req.params.emoji ?? "")).trim();
    } catch {
      return res.status(400).json(apiErrorBody("Invalid emoji in path", null));
    }
    if (!emoji) {
      return res.status(400).json(apiErrorBody("emoji is required", null));
    }
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    await prisma.discussionMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    const reactions = await loadReactionsForMessage(messageId);
    await emitReactionSocket(messageId, "reaction:update", {
      messageId,
      reactions,
      emoji,
      userId,
      action: "remove",
    });
    return res.json({ reactions });
  } catch (error) {
    console.error("DELETE /discussions/messages/:messageId/reactions/:emoji failed", error);
    return res.status(500).json(apiErrorBody("Failed to remove reaction", null));
  }
});

router.post("/messages/:messageId/reactions", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    const parsed = serverReactionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
    }
    const emoji = parsed.data.emoji;
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    try {
      await prisma.discussionMessageReaction.create({
        data: { messageId, userId, emoji },
      });
    } catch (err) {
      if (err?.code === "P2002") {
        return res.status(409).json(apiErrorBody("Reaction already exists", null));
      }
      throw err;
    }
    const reactions = await loadReactionsForMessage(messageId);
    const targetMsg = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, groupId: true, channelId: true },
    });
    const reactor = await prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true },
    });
    if (targetMsg && targetMsg.senderId !== userId) {
      await prisma.discussionNotification.create({
        data: {
          userId: targetMsg.senderId,
          groupId: targetMsg.groupId,
          messageId,
          type: "REACTION",
          payload: {
            groupId: targetMsg.groupId,
            channelId: targetMsg.channelId,
            messageId,
            reactorId: userId,
            reactorName: reactor?.full_name ?? null,
            emoji,
          },
        },
      });
    }
    await emitReactionSocket(messageId, "reaction:update", {
      messageId,
      reactions,
      emoji,
      userId,
      action: "add",
    });
    return res.status(201).json({ reactions });
  } catch (error) {
    console.error("POST /discussions/messages/:messageId/reactions failed", error);
    return res.status(500).json(apiErrorBody("Failed to add reaction", null));
  }
});

router.delete("/messages/:messageId/reactions", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    const parsed = serverReactionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
    }
    const emoji = parsed.data.emoji;
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    await prisma.discussionMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    const reactions = await loadReactionsForMessage(messageId);
    await emitReactionSocket(messageId, "reaction:update", {
      messageId,
      reactions,
      emoji,
      userId,
      action: "remove",
    });
    return res.json({ reactions });
  } catch (error) {
    console.error("DELETE /discussions/messages/:messageId/reactions failed", error);
    return res.status(500).json(apiErrorBody("Failed to remove reaction", null));
  }
});

export default router;
