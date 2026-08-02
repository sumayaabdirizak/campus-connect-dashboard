import { metricTimerEnd } from "../../../services/discussions/reliability/metrics.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
} from "../../../services/discussions/discussionMessagePublic.js";
import { prisma } from "../../../db/prisma.js";
import { validateChannelMessagePreconditions } from "./send-channel-message/channelValidate.js";
import { persistChannelMessageInTx } from "./send-channel-message/channelPersist.js";
import { notifyOfflineOrMentionedByEmail } from "./discussion-send/emailNotify.js";
import { buildMessagePublicIdMap, toMessageDto } from "../../../controllers/discussions/messageShared.js";

/** @param {object} args */
export async function sendChannelMessage(args) {
  const {
    socket, payload, ack, channelId, channelPublicId,
    socketUser, fanout, ackOrEmitError, ackSuccess,
    discussionChannelRoom, discussionRoom,
    emitUnreadUpdateToUsers, touchDiscussionSession,
    started, attachmentIds, e2e,
  } = args;

  const pre = await validateChannelMessagePreconditions(args);
  if (!pre.ok) return pre.ack();

  const result = await prisma.$transaction((tx) =>
    persistChannelMessageInTx(tx, {
      ...pre,
      channelId,
      socketUser,
      attachmentIds,
      e2e,
      isUserViewingChannel: args.isUserViewingChannel,
      getActiveDiscussionUserIdSet: args.getActiveDiscussionUserIdSet,
    }),
  );

  await touchDiscussionSession(socket);
  const channelMembership = await prisma.discussionGroupMembership.findFirst({
    where: { groupId: result.serverId, userId: Number(socketUser.id), leftAt: null, isActive: true },
  });
  const serverRow = await prisma.discussionGroup.findUnique({
    where: { id: result.serverId },
    select: { publicId: true },
  });

  const publicIdById = await buildMessagePublicIdMap(result.message ? [result.message] : []);
  const rawOutMsg = {
    ...toMessageDto(result.message, publicIdById),
    channelId: channelPublicId,
    groupId: serverRow?.publicId ?? null,
  };
  const outMsg = applyAnonymousSenderPolicy(rawOutMsg, Number(socketUser.id), channelMembership);
  const wsMsg = rawOutMsg.isAnonymous
    ? applyAnonymousSenderPolicy(rawOutMsg, null, null, { broadcast: true })
    : rawOutMsg;

  fanout.emitToRoom(discussionChannelRoom(channelId), "message:new", wsMsg);
  fanout.emitToRoom(discussionChannelRoom(channelId), "discussion:message:new", wsMsg);
  fanout.emitToRoom(discussionRoom(result.serverId), "discussion:message:new", wsMsg);

  for (const recipientUserId of result.popupRecipientIds) {
    fanout.emitToUser(recipientUserId, "notification:new", {
      type: "MESSAGE",
      groupId: serverRow?.publicId ?? null,
      channelId: channelPublicId,
      messageId: rawOutMsg.id,
      senderId: Number(socketUser.id),
      senderName: anonymousSafeSenderName(rawOutMsg),
      createdAt: new Date().toISOString(),
    });
  }

  await emitUnreadUpdateToUsers(result.onlineNotViewingIds);

  notifyOfflineOrMentionedByEmail({
    memberUserIds: result.memberIds,
    offlineIds: result.offlineIds,
    mentionUserIds: result.mentionUserIds,
    senderName: result.message?.sender?.full_name || "Someone",
    conversationLabel: `#${pre.channel.name}`,
    plaintext: result.message?.content ?? "",
    href: `/dashboard/messages?server=${result.serverId}&channel=${channelId}`,
  }).catch(() => {});

  metricTimerEnd("messages.send_total.ms", started);
  return ackSuccess(ack, {
    message: outMsg,
    notification: {
      onlineRecipients: result.onlineNotViewingIds.length,
      offlineRecipients: result.offlineIds.length,
      popupRecipients: result.popupRecipientIds.length,
    },
  });
}
