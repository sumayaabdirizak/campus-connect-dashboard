import { prisma } from "../../../db/prisma.js";
import { metricCount, metricTimerEnd, metricTimerStart } from "../../../features/discussions/reliability/metrics.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "../../../features/discussions/permissions.js";
import { extractMentionHandles, resolveMentionUserIds } from "../../../features/discussions/mentionResolution.js";
import {
  excludeDoNotDisturbUserIds,
  getDiscussionPresenceWindowMs,
  isDoNotDisturbStatus,
} from "../../../features/discussions/discussionPresence.js";
import {
  collectThreadParticipantSenderIds,
  resolveThreadRootMessageId,
} from "../../../features/discussions/threadParticipants.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
  deriveQuestionFields,
} from "../../../features/discussions/discussionMessagePublic.js";
import { sendChannelMessage } from "./send-channel-message.js";
import { sendGroupDmMessage } from "./send-group-dm-message.js";
import { sendGroupMessage } from "./send-group-message.js";

/**
 * @param {import("socket.io").Socket} socket
 * @param {object} ctx
 */
export function registerMessageSendHandler(socket, ctx) {
  const {
    socketUser, fanout, ackOrEmitError, ackSuccess,
    discussionChannelRoom, discussionRoom, discussionGroupDmRoom,
    emitUnreadUpdateToUsers, isUserViewingChannel, isUserViewingGroup, isUserViewingGroupDm,
    getActiveDiscussionUserIdSet, getDiscussionMembership, touchDiscussionSession,
  } = ctx;

  socket.on("message:send", async (payload = {}, ack) => {
    try {
      const started = metricTimerStart();
      const channelId = Number(payload?.channelId);
      const attachmentIds = Array.isArray(payload?.attachmentIds)
        ? payload.attachmentIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];
      const e2e = payload?.e2e ?? null;
      const messageTypeUpper =
        typeof payload?.messageType === "string" ? payload.messageType.toUpperCase() : "TEXT";

      const shared = {
        socket, payload, ack, socketUser, fanout, ackOrEmitError, ackSuccess,
        discussionChannelRoom, discussionRoom, discussionGroupDmRoom,
        emitUnreadUpdateToUsers, isUserViewingChannel, isUserViewingGroup, isUserViewingGroupDm,
        getActiveDiscussionUserIdSet, getDiscussionMembership, touchDiscussionSession,
        started, attachmentIds, e2e, messageTypeUpper,
      };

      if (Number.isFinite(channelId) && channelId > 0) {
        return await sendChannelMessage({ ...shared, channelId });
      }
      const groupDmId = Number(payload?.groupDmId);
      if (Number.isFinite(groupDmId) && groupDmId > 0) {
        return await sendGroupDmMessage({ ...shared, groupDmId });
      }
      return await sendGroupMessage(shared);
    } catch (error) {
      metricCount("messages.send_failed", 1);
      console.error("message:send failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to send message");
    }
  });
}
