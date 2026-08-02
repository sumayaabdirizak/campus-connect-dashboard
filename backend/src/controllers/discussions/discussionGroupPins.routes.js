import express from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import { requireActiveDiscussionMembership } from "../../services/discussions/discussionMembership.js";
import { applyAnonymousSenderPolicy } from "../../services/discussions/discussionMessagePublic.js";
import { toDiscussionAttachmentDto } from "../../services/discussions/discussionAttachments.js";
import { pinBodySchema } from "../../validation/groupDiscussionSchemas.js";
import { resolveServerRow } from "./serverShared.js";
import { resolveMessageRow, toMessageDto, buildMessagePublicIdMap } from "./messageShared.js";

const router = express.Router();

router.get("/groups/:groupId/pins", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupRow = await resolveServerRow(req.params.groupId);
    if (!groupRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const groupId = groupRow.id;
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const pins = await prisma.discussionPinnedMessage.findMany({
      where: { groupId, unpinnedAt: null },
      orderBy: { pinnedAt: "desc" },
      include: {
        message: {
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        },
        pinnedBy: { select: { id: true, full_name: true } },
      },
    });
    const publicIdById = await buildMessagePublicIdMap(pins.filter((p) => p.message).map((p) => p.message));
    const results = pins
      .filter((p) => p.message && !p.message.deletedAt)
      .map((p) => {
        const msgRaw = {
          ...toMessageDto(p.message, publicIdById),
          attachments: (p.message.attachments || []).map((a) => toDiscussionAttachmentDto(req, a, userId)),
        };
        return {
          id: p.id,
          groupId: groupRow.publicId,
          messageId: publicIdById.get(p.messageId) ?? null,
          pinnedAt: p.pinnedAt,
          pinnedBy: p.pinnedBy,
          message: applyAnonymousSenderPolicy(msgRaw, userId, membership),
        };
      });
    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId/pins failed", error);
    return res.status(500).json(apiErrorBody("Failed to list pins", null));
  }
});

router.post("/groups/:groupId/pins", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupRow = await resolveServerRow(req.params.groupId);
    if (!groupRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const groupId = groupRow.id;
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!membership.canModerate) {
      return res.status(403).json(apiErrorBody("Only moderators can pin messages", null));
    }
    const parsed = pinBodySchema.parse(req.body ?? {});
    const message = await resolveMessageRow(parsed.messageId, { groupId, deletedAt: null });
    if (!message) {
      return res.status(404).json(apiErrorBody("Message not found in this group", null));
    }
    const messageId = message.id;
    const existing = await prisma.discussionPinnedMessage.findFirst({
      where: { groupId, messageId, unpinnedAt: null },
    });
    if (existing) {
      return res.status(409).json(apiErrorBody("Message is already pinned", null));
    }
    const pin = await prisma.discussionPinnedMessage.create({
      data: {
        groupId,
        messageId,
        pinnedById: userId,
      },
      include: {
        message: {
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        },
        pinnedBy: { select: { id: true, full_name: true } },
      },
    });
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:pinned", {
        groupId: groupRow.publicId,
        messageId: message.publicId,
        pinnedById: userId,
        pinnedAt: pin.pinnedAt,
      });
    }
    const pinMembers = await prisma.discussionGroupMembership.findMany({
      where: { groupId, leftAt: null, isActive: true, userId: { not: userId } },
      select: { userId: true },
    });
    if (pinMembers.length > 0) {
      await prisma.discussionNotification.createMany({
        data: pinMembers.map((m) => ({
          userId: m.userId,
          groupId,
          messageId,
          type: "PIN",
          payload: {
            groupId: groupRow.publicId,
            messageId: message.publicId,
            pinnedById: userId,
            pinnedByName: pin.pinnedBy?.full_name ?? null,
          },
        })),
      });
    }
    const pinMessagePublicIdById = pin.message ? await buildMessagePublicIdMap([pin.message]) : new Map();
    return res.status(201).json({
      pin: {
        id: pin.id,
        groupId: groupRow.publicId,
        messageId: message.publicId,
        pinnedAt: pin.pinnedAt,
        pinnedBy: pin.pinnedBy,
        message: pin.message
          ? {
              ...toMessageDto(pin.message, pinMessagePublicIdById),
              attachments: (pin.message.attachments || []).map((a) => toDiscussionAttachmentDto(req, a, userId)),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("POST /discussions/groups/:groupId/pins failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to pin message", null));
  }
});

router.delete("/groups/:groupId/pins/:messageId", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupRow = await resolveServerRow(req.params.groupId);
    if (!groupRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const groupId = groupRow.id;
    const messageRow = await resolveMessageRow(req.params.messageId, { groupId });
    if (!messageRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const messageId = messageRow.id;
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!membership.canModerate) {
      return res.status(403).json(apiErrorBody("Only moderators can unpin messages", null));
    }
    const result = await prisma.discussionPinnedMessage.updateMany({
      where: { groupId, messageId, unpinnedAt: null },
      data: { unpinnedAt: new Date() },
    });
    const io = getIo();
    if (io && result.count) {
      io.to(`discussion:group:${groupId}`).emit("message:unpinned", {
        groupId: groupRow.publicId,
        messageId: messageRow.publicId,
      });
    }
    return res.json({ ok: true, updatedCount: result.count });
  } catch (error) {
    console.error("DELETE /discussions/groups/:groupId/pins/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to unpin message", null));
  }
});
export default router;
