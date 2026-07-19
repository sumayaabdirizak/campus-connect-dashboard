import express from "express";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import { PERMISSION_BITS, requireChannelPermission } from "../../../../features/discussions/permissions.js";
import { emitDiscussionNotificationEvents } from "../../../../features/discussions/notificationEmit.js";
import { applyAnonymousSenderPolicy } from "../../../../features/discussions/discussionMessagePublic.js";
import { getDiscussionCallerUserId } from "../../../../features/discussions/discussionCaller.js";
import { enrichDiscussionMessagesAttachments } from "../../../../features/discussions/discussionAttachments.js";
import { sendChannelMessageSchema } from "../../../../features/discussions/validation/serverSchemas.js";
import {
  checkMemberMuted,
  checkSlowMode,
  deriveChannelMessageContent,
  loadChannelForSend,
  loadChannelMembership,
  validateParentMessage,
  validatePendingAttachments,
} from "./postMessagePrepare.helpers.js";
import { createChannelMessageTransaction } from "./postMessageTx.helpers.js";

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

      if (!(await validateParentMessage(channelId, body.parentMessageId))) {
        return res
          .status(400)
          .json(apiErrorBody("parentMessageId must be a root message in this channel", null));
      }

      const contentFields = deriveChannelMessageContent(body, body.parentMessageId ?? null);
      if (contentFields.error) return res.status(400).json(contentFields.error);

      if (!(await validatePendingAttachments(contentFields.attachmentIds, userId, channel.serverId))) {
        return res
          .status(400)
          .json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
      }

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

      const rawOut = enrichDiscussionMessagesAttachments(
        req,
        [{ ...message, channelId, serverId: channel.serverId }],
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
