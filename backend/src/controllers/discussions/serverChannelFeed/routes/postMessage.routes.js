import express from "express";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import { PERMISSION_BITS, requireChannelPermission } from "../../../../services/discussions/permissions.js";
import { emitDiscussionNotificationEvents } from "../../../../services/discussions/notificationEmit.js";
import { applyAnonymousSenderPolicy } from "../../../../services/discussions/discussionMessagePublic.js";
import { getDiscussionCallerUserId } from "../../../../services/discussions/discussionCaller.js";
import { enrichDiscussionMessagesAttachments } from "../../../../services/discussions/discussionAttachments.js";
import { sendChannelMessageSchema } from "../../../../validation/serverSchemas.js";
import {
  checkMemberMuted,
  checkSlowMode,
  deriveChannelMessageContent,
  loadChannelForSend,
  loadChannelMembership,
  resolveParentMessage,
  resolvePendingAttachmentIds,
} from "./postMessagePrepare.helpers.js";
import { createChannelMessageTransaction } from "./postMessageTx.helpers.js";
import {
  resolveReplyToMessageId,
} from "../../../../services/discussions/replyToMessage.js";
import { buildMessagePublicIdMap, toMessageDto } from "../../messageShared.js";
import { prisma } from "../../../../db/prisma.js";

const router = express.Router();

router.post(
  "/channels/:channelId/messages",
  requireChannelPermission(PERMISSION_BITS.SEND_MESSAGES),
  async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      const channelId = req.discussionChannelId;
      const parseResult = sendChannelMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parseResult.error.issues));
      }
      const body = parseResult.data;

      const channel = await loadChannelForSend(channelId);
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));

      const channelMembership = await loadChannelMembership(channel.serverId, userId);
      const mutedUntil = checkMemberMuted(channelMembership);
      if (mutedUntil) {
        return res.status(403).json(
          apiErrorBody("You are muted in this server", {
            code: "MEMBER_MUTED",
            mutedUntil: mutedUntil.toISOString(),
          }),
        );
      }

      const resolvedParentMessageId = await resolveParentMessage(channelId, body.parentMessageId);
      if (resolvedParentMessageId === null) {
        return res
          .status(400)
          .json(apiErrorBody("parentMessageId must be a root message in this channel", null));
      }
      body.parentMessageId = resolvedParentMessageId ?? null;

      const replyToId = await resolveReplyToMessageId(prisma, {
        replyToMessageId: body.replyToMessageId,
        channelId,
      });
      if (body.replyToMessageId != null && replyToId == null) {
        return res
          .status(400)
          .json(apiErrorBody("replyToMessageId must be a message in this channel", null));
      }
      body.replyToMessageId = replyToId;

      const resolvedAttachmentIds = await resolvePendingAttachmentIds(
        body.attachmentIds ?? [],
        userId,
        channel.serverId,
      );
      if (resolvedAttachmentIds === null) {
        return res
          .status(400)
          .json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
      }
      body.attachmentIds = resolvedAttachmentIds;

      const contentFields = deriveChannelMessageContent(body, body.parentMessageId ?? null);
      if (contentFields.error) return res.status(400).json(contentFields.error);

      const slowModeResponse = await checkSlowMode({
        channel,
        channelId,
        userId,
        channelPermissions: req.discussionChannelPermissions,
      });
      if (slowModeResponse) return res.status(429).json(slowModeResponse);

      const txResult = await createChannelMessageTransaction({
        channel,
        channelId,
        userId,
        body,
        contentFields,
      });

      const message = txResult?.message;
      const notificationEvents = txResult?.notificationEvents ?? [];
      if (!message) return res.status(500).json(apiErrorBody("Failed to create message", null));

      const publicIdById = await buildMessagePublicIdMap([message]);
      const rawOut = enrichDiscussionMessagesAttachments(
        req,
        [
          {
            ...toMessageDto(message, publicIdById),
            channelId: req.discussionChannelPublicId,
            groupId: channel.server.publicId,
          },
        ],
        userId,
      )[0];
      const outPayload = applyAnonymousSenderPolicy(rawOut, userId, channelMembership);
      const wsPayload = rawOut.isAnonymous
        ? applyAnonymousSenderPolicy(rawOut, null, null, { broadcast: true })
        : rawOut;

      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("message:new", wsPayload);
          io.to(`channel:${channelId}`).emit("discussion:message:new", wsPayload);
        }
      } catch (emitErr) {
        console.warn("Socket emit failed for channel message:new", emitErr?.message);
      }

      try {
        await emitDiscussionNotificationEvents(notificationEvents);
      } catch (emitErr) {
        console.warn("Socket emit failed for channel notifications", emitErr?.message);
      }

      return res.status(201).json({ message: outPayload });
    } catch (error) {
      console.error("POST /discussions/channels/:channelId/messages failed", error);
      return res.status(500).json(apiErrorBody("Failed to send message", null));
    }
  },
);

export default router;
