import express from "express";
import { z } from "zod";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import {
  applyAnonymousSenderPolicy,
  deriveQuestionFields,
} from "../../../../features/discussions/discussionMessagePublic.js";
import {
  requireActiveDiscussionMembership,
  resolveDiscussionE2EERequirement,
} from "../../../../features/discussions/discussionMembership.js";
import { buildUnreadSocketPayload } from "../../../../features/discussions/buildUnreadPayload.js";
import { toDiscussionAttachmentDto } from "../../../../features/discussions/discussionAttachments.js";
import { sendMessageSchema } from "../../../../features/discussions/validation/groupDiscussionSchemas.js";
import { createGroupMessageTransaction } from "./postMessage.helpers.js";
import { resolveServerRow } from "../../serverShared.js";
import { resolveMessageRow, resolveAttachmentIds, buildMessagePublicIdMap, toMessageDto } from "../../messageShared.js";

const router = express.Router();

router.post("/groups/:groupId/messages", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupRow = await resolveServerRow(req.params.groupId);
    if (!groupRow) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const groupId = groupRow.id;
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!membership.canPost) return res.status(403).json(apiErrorBody("Posting is disabled for this user", null));

    const parsed = sendMessageSchema.parse(req.body ?? {});
    const attachmentIdentifiers = parsed.attachmentIds ?? [];
    const parentMessageRow =
      parsed.parentMessageId != null ? await resolveMessageRow(parsed.parentMessageId, { groupId }) : null;
    if (parsed.parentMessageId != null && !parentMessageRow) {
      return res.status(400).json(apiErrorBody("parentMessageId not found in this group", null));
    }
    const parentMessageId = parentMessageRow?.id ?? null;

    const derived = deriveQuestionFields({
      content: parsed.content ?? "",
      messageType: parsed.messageType,
      postAsQuestion: parsed.postAsQuestion,
      isAnonymous: parsed.isAnonymous,
      parentMessageId,
    });
    const attachmentIds = await resolveAttachmentIds(attachmentIdentifiers);
    if (attachmentIds.length !== attachmentIdentifiers.length) {
      return res
        .status(400)
        .json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
    }

    const effectiveContent = derived.contentStored.trim();
    const hasText = effectiveContent.length > 0;
    let messageType = attachmentIds.length > 0 && !hasText ? "MEDIA" : derived.messageType;
    let isAnonymousFlag = derived.isAnonymous;
    if (messageType !== "QUESTION") isAnonymousFlag = false;
    if (messageType === "QUESTION" && !hasText) {
      return res.status(400).json(apiErrorBody("Question text is required", null));
    }

    const e2eeRequired = await resolveDiscussionE2EERequirement(groupId);
    if (e2eeRequired && !parsed.e2e) {
      return res.status(400).json(
        apiErrorBody(
          "E2E payload is required for this group (ciphertext, nonce, keyVersion, senderDeviceId)",
          null,
        ),
      );
    }
    if (!hasText && attachmentIds.length === 0) {
      return res.status(400).json(apiErrorBody("Either content or attachmentIds is required", null));
    }

    if (attachmentIds.length > 0) {
      const pendingAttachments = await prisma.discussionAttachment.findMany({
        where: {
          id: { in: attachmentIds },
          uploadedById: userId,
          status: "PENDING",
          messageId: null,
          OR: [{ groupId }, { groupId: null }],
        },
      });
      if (pendingAttachments.length !== attachmentIds.length) {
        return res
          .status(400)
          .json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
      }
    }

    const message = await createGroupMessageTransaction({
      groupId,
      userId,
      parsed,
      effectiveContent,
      hasText,
      messageType,
      isAnonymousFlag,
      e2eeRequired,
      parentMessageId,
      attachmentIds,
    });

    const fullMessage = await prisma.discussionMessage.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, full_name: true, avatarUrl: true } },
        attachments: true,
      },
    });
    const publicIdById = await buildMessagePublicIdMap([fullMessage]);
    const fullMessageDtoRaw = {
      ...toMessageDto(fullMessage, publicIdById),
      groupId: groupRow.publicId,
      attachments: (fullMessage?.attachments || []).map((attachment) =>
        toDiscussionAttachmentDto(req, attachment, userId),
      ),
    };
    const fullMessageDto = applyAnonymousSenderPolicy(fullMessageDtoRaw, userId, membership);
    const wsMessageDto = fullMessageDtoRaw.isAnonymous
      ? applyAnonymousSenderPolicy(fullMessageDtoRaw, null, null, { broadcast: true })
      : fullMessageDtoRaw;

    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("discussion:message:new", wsMessageDto);
      const unread = await prisma.discussionNotification.groupBy({
        by: ["userId", "groupId"],
        where: { readAt: null, groupId, userId: { not: userId } },
        _count: { groupId: true },
      });
      const users = [...new Set(unread.map((u) => Number(u.userId)))];
      for (const uid of users) {
        const payload = await buildUnreadSocketPayload(uid);
        io.to(`user:${uid}`).emit("unread:update", payload);
      }
    }

    return res.status(201).json(fullMessageDto);
  } catch (error) {
    console.error("POST /discussions/groups/:groupId/messages failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to send message", null));
  }
});

export default router;
