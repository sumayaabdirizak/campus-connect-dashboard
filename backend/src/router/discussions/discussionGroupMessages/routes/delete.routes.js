import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import { requireActiveDiscussionMembership } from "../../../../services/discussions/discussionMembership.js";
import { resolveServerRow } from "../../../../controllers/discussions/serverShared.js";
import { whereFromParam } from "../../../../services/discussions/publicIdResolution.js";

const router = express.Router();

router.delete("/groups/:groupId/messages/:messageId", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupRow = await resolveServerRow(req.params.groupId);
    if (!groupRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const groupId = groupRow.id;
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msgWhere = whereFromParam(req.params.messageId);
    const msg = msgWhere
      ? await prisma.discussionMessage.findFirst({
          where: { ...msgWhere, groupId, deletedAt: null },
          select: { id: true, publicId: true, senderId: true },
        })
      : null;
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const messageId = msg.id;
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
        groupId: groupRow.publicId,
        messageId: msg.publicId,
        deletedAt: new Date().toISOString(),
      });
    }
    return res.json({ ok: true, messageId: msg.publicId });
  } catch (error) {
    console.error("DELETE /discussions/groups/:groupId/messages/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to delete message", null));
  }
});

export default router;
