import express from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import { requireActiveDiscussionMembership } from "../../features/discussions/discussionMembership.js";
import { applyAnonymousSenderPolicy } from "../../features/discussions/discussionMessagePublic.js";
import { toDiscussionAttachmentDto } from "../../features/discussions/discussionAttachments.js";
import { pinBodySchema } from "../../features/discussions/validation/groupDiscussionSchemas.js";

const router = express.Router();

router.get("/groups/:groupId/pins", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
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
    const results = pins
      .filter((p) => p.message && !p.message.deletedAt)
      .map((p) => {
        const msgRaw = {
          ...p.message,
          attachments: (p.message.attachments || []).map((a) => toDiscussionAttachmentDto(req, a, userId)),
        };
        return {
          id: p.id,
          groupId: p.groupId,
          messageId: p.messageId,
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
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!membership.canModerate) {
      return res.status(403).json(apiErrorBody("Only moderators can pin messages", null));
    }
    const parsed = pinBodySchema.parse(req.body ?? {});
    const message = await prisma.discussionMessage.findFirst({
      where: { id: parsed.messageId, groupId, deletedAt: null },
      select: { id: true },
    });
    if (!message) {
      return res.status(404).json(apiErrorBody("Message not found in this group", null));
    }
    const existing = await prisma.discussionPinnedMessage.findFirst({
      where: { groupId, messageId: parsed.messageId, unpinnedAt: null },
    });
    if (existing) {
      return res.status(409).json(apiErrorBody("Message is already pinned", null));
    }
    const pin = await prisma.discussionPinnedMessage.create({
      data: {
        groupId,
        messageId: parsed.messageId,
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
        groupId,
        messageId: pin.messageId,
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
          messageId: parsed.messageId,
          type: "PIN",
          payload: {
            groupId,
            messageId: parsed.messageId,
            pinnedById: userId,
            pinnedByName: pin.pinnedBy?.full_name ?? null,
          },
        })),
      });
    }
    return res.status(201).json({
      pin: {
        id: pin.id,
        groupId: pin.groupId,
        messageId: pin.messageId,
        pinnedAt: pin.pinnedAt,
        pinnedBy: pin.pinnedBy,
        message: pin.message
          ? {
              ...pin.message,
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
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
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
      io.to(`discussion:group:${groupId}`).emit("message:unpinned", { groupId, messageId });
    }
    return res.json({ ok: true, updatedCount: result.count });
  } catch (error) {
    console.error("DELETE /discussions/groups/:groupId/pins/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to unpin message", null));
  }
});
export default router;
