import express from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import {
  requireActiveDiscussionMembership,
  resolveDiscussionE2EERequirement,
} from "../../features/discussions/discussionMembership.js";
import { isDiscussionQaChannelNameKey } from "../../features/discussions/discussionMessagePublic.js";
import { toDiscussionAttachmentDto } from "../../features/discussions/discussionAttachments.js";
import {
  editMessageSchema,
  reactionBodySchema,
  acceptedAnswerBodySchema,
} from "../../features/discussions/validation/groupDiscussionSchemas.js";

const router = express.Router();

router.post("/groups/:groupId/messages/:messageId/accepted-answer", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));

    const group = await prisma.discussionGroup.findUnique({
      where: { id: groupId },
      select: { name: true, groupKey: true },
    });
    if (!group) {
      return res.status(400).json(apiErrorBody("Group not found", null));
    }

    const role = String(membership.role || "").toUpperCase();
    const canMark =
      membership.canModerate ||
      ["TA", "ADVISOR", "HEAD", "LECTURER", "ADMIN", "DEAN"].includes(role);
    if (!canMark) {
      return res.status(403).json(apiErrorBody("You cannot mark an answer in this channel", null));
    }

    const parsed = acceptedAnswerBodySchema.parse(req.body ?? {});
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true, parentMessageId: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    if (msg.parentMessageId == null) {
      return res
        .status(400)
        .json(apiErrorBody("Only thread replies can be marked as the accepted answer", null));
    }
    const parentId = msg.parentMessageId;
    const parentRoot = await prisma.discussionMessage.findFirst({
      where: { id: parentId, groupId, deletedAt: null },
      select: { id: true, messageType: true },
    });
    const inQaChannel = isDiscussionQaChannelNameKey(group.groupKey, group.name);
    const parentIsQuestion = parentRoot?.messageType === "QUESTION";
    if (!inQaChannel && !parentIsQuestion) {
      return res
        .status(400)
        .json(
          apiErrorBody(
            "Accepted answer is only available in Q&A-style channels or on question threads",
            null
          )
        );
    }

    if (parsed.accepted) {
      await prisma.discussionMessage.updateMany({
        where: { groupId, parentMessageId: parentId, deletedAt: null },
        data: { isAcceptedAnswer: false },
      });
      await prisma.discussionMessage.update({
        where: { id: messageId },
        data: { isAcceptedAnswer: true },
      });
    } else {
      await prisma.discussionMessage.update({
        where: { id: messageId },
        data: { isAcceptedAnswer: false },
      });
    }

    const winner = await prisma.discussionMessage.findFirst({
      where: { groupId, parentMessageId: parentId, deletedAt: null, isAcceptedAnswer: true },
      select: { id: true },
    });

    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:accepted-answer", {
        groupId,
        parentMessageId: parentId,
        acceptedMessageId: winner?.id ?? null,
      });
    }

    return res.json({
      ok: true,
      parentMessageId: parentId,
      acceptedMessageId: winner?.id ?? null,
    });
  } catch (error) {
    console.error(
      "POST /discussions/groups/:groupId/messages/:messageId/accepted-answer failed",
      error
    );
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to update accepted answer", null));
  }
});

router.patch("/groups/:groupId/messages/:messageId", async (req, res) => {
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
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    if (Number(msg.senderId) !== userId) {
      return res.status(403).json(apiErrorBody("Only the author can edit this message", null));
    }
    const parsed = editMessageSchema.parse(req.body ?? {});
    const e2eeRequired = await resolveDiscussionE2EERequirement(groupId);
    if (e2eeRequired) {
      if (!parsed.e2e) {
        return res.status(400).json(
          apiErrorBody("E2E payload is required to edit messages in this group", null)
        );
      }
    }
    const hasContent = typeof parsed.content === "string" && parsed.content.trim().length > 0;
    if (!e2eeRequired && !hasContent && !parsed.e2e) {
      return res.status(400).json(apiErrorBody("content or e2e payload is required", null));
    }
    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: {
        editedAt: new Date(),
        content: e2eeRequired ? null : hasContent ? parsed.content.trim() : msg.content,
        ciphertext: parsed.e2e?.ciphertext ?? msg.ciphertext,
        nonce: parsed.e2e?.nonce ?? msg.nonce,
        keyVersion: Number.isFinite(Number(parsed.e2e?.keyVersion))
          ? Number(parsed.e2e.keyVersion)
          : msg.keyVersion,
        senderDeviceId: parsed.e2e?.senderDeviceId ?? msg.senderDeviceId,
      },
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
      },
    });
    const dto = {
      ...updated,
      attachments: (updated.attachments || []).map((a) => toDiscussionAttachmentDto(req, a, userId)),
    };
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:edited", {
        groupId,
        messageId,
        content: dto.content,
        ciphertext: dto.ciphertext,
        nonce: dto.nonce,
        editedAt: dto.editedAt,
      });
    }
    return res.json({ message: dto });
  } catch (error) {
    console.error("PATCH /discussions/groups/:groupId/messages/:messageId failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to edit message", null));
  }
});

router.delete("/groups/:groupId/messages/:messageId", async (req, res) => {
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
      select: { id: true, senderId: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const isAuthor = Number(msg.senderId) === userId;
    if (!isAuthor && !membership.canModerate) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }
    await prisma.discussionMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: null,
        ciphertext: null,
        nonce: null,
      },
    });
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:deleted", {
        groupId,
        messageId,
        deletedAt: new Date().toISOString(),
      });
    }
    return res.json({ ok: true, messageId });
  } catch (error) {
    console.error("DELETE /discussions/groups/:groupId/messages/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to delete message", null));
  }
});

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
    const byEmoji = new Map();
    for (const r of rows) {
      if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
      byEmoji.get(r.emoji).push({
        userId: r.userId,
        full_name: r.user?.full_name ?? null,
        createdAt: r.createdAt,
      });
    }
    const results = [...byEmoji.entries()].map(([emoji, users]) => ({ emoji, users }));
    return res.json({ results });
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
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: parsed.emoji,
        },
      },
      create: { messageId, userId, emoji: parsed.emoji },
      update: {},
    });
    const rows = await prisma.discussionMessageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, full_name: true } } },
    });
    const byEmoji = new Map();
    for (const r of rows) {
      if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
      byEmoji.get(r.emoji).push({ userId: r.userId, full_name: r.user?.full_name ?? null });
    }
    const summary = [...byEmoji.entries()].map(([emoji, users]) => ({ emoji, users }));
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
    const byEmoji = new Map();
    for (const r of rows) {
      if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
      byEmoji.get(r.emoji).push({ userId: r.userId, full_name: r.user?.full_name ?? null });
    }
    const summary = [...byEmoji.entries()].map(([e, users]) => ({ emoji: e, users }));
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
