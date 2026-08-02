import express from "express";
import { z } from "zod";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import {
  requireActiveDiscussionMembership,
  resolveDiscussionE2EERequirement,
} from "../../../../services/discussions/discussionMembership.js";
import { toDiscussionAttachmentDto } from "../../../../services/discussions/discussionAttachments.js";
import { editMessageSchema } from "../../../../validation/groupDiscussionSchemas.js";
import { resolveServerRow } from "../../../../controllers/discussions/serverShared.js";
import { resolveMessageRow, buildMessagePublicIdMap, toMessageDto } from "../../../../controllers/discussions/messageShared.js";

const router = express.Router();

router.patch("/groups/:groupId/messages/:messageId", async (req, res) => {
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
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    if (Number(msg.senderId) !== userId) {
      return res.status(403).json(apiErrorBody("Only the author can edit this message", null));
    }
    const parsed = editMessageSchema.parse(req.body ?? {});
    const e2eeRequired = await resolveDiscussionE2EERequirement(groupId);
    if (e2eeRequired && !parsed.e2e) {
      return res.status(400).json(
        apiErrorBody("E2E payload is required to edit messages in this group", null),
      );
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
    const publicIdById = await buildMessagePublicIdMap([updated]);
    const dto = {
      ...toMessageDto(updated, publicIdById),
      groupId: groupRow.publicId,
      attachments: (updated.attachments || []).map((a) => toDiscussionAttachmentDto(req, a, userId)),
    };
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:edited", {
        groupId: groupRow.publicId,
        messageId: updated.publicId,
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

export default router;
