import express from "express";
import { z } from "zod";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import { requireActiveDiscussionMembership } from "../../../../features/discussions/discussionMembership.js";
import { isDiscussionQaChannelNameKey } from "../../../../features/discussions/discussionMessagePublic.js";
import { acceptedAnswerBodySchema } from "../../../../features/discussions/validation/groupDiscussionSchemas.js";

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
    if (!group) return res.status(400).json(apiErrorBody("Group not found", null));

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
            null,
          ),
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
      error,
    );
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to update accepted answer", null));
  }
});

export default router;
