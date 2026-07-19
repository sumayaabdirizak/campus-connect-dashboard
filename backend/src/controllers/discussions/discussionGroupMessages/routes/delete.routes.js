import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import { requireActiveDiscussionMembership } from "../../../../features/discussions/discussionMembership.js";

const router = express.Router();

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
      data: { deletedAt: new Date(), content: null, ciphertext: null, nonce: null },
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

export default router;
