import { metricTimerEnd } from "../../../services/discussions/reliability/metrics.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
} from "../../../services/discussions/discussionMessagePublic.js";
import { prisma } from "../../../db/prisma.js";
import { validateGroupMessagePreconditions } from "./send-group-message/groupValidate.js";
import { persistGroupMessageInTx } from "./send-group-message/groupPersist.js";
import { notifyOfflineOrMentionedByEmail } from "./discussion-send/emailNotify.js";
import { buildMessagePublicIdMap, toMessageDto } from "../../../controllers/discussions/messageShared.js";

/** @param {object} args */
export async function sendGroupMessage(args) {
  const {
    socket, payload, ack,
    socketUser, fanout, ackOrEmitError, ackSuccess,
    discussionRoom,
    emitUnreadUpdateToUsers, touchDiscussionSession,
    started, attachmentIds, e2e,
  } = args;

  const pre = await validateGroupMessagePreconditions(args);
  if (!pre.ok) return pre.ack();

  const result = await prisma.$transaction((tx) =>
    persistGroupMessageInTx(tx, {
      ...pre,
      socketUser,
      attachmentIds,
      e2e,
      isUserViewingGroup: args.isUserViewingGroup,
      getActiveDiscussionUserIdSet: args.getActiveDiscussionUserIdSet,
    }),
  );

  await touchDiscussionSession(socket);
  const publicIdById = await buildMessagePublicIdMap(result.message ? [result.message] : []);
  const rawGroupMsg = { ...toMessageDto(result.message, publicIdById), groupId: pre.groupPublicId };
  const outGroupMsg = applyAnonymousSenderPolicy(rawGroupMsg, Number(socketUser.id), pre.membership);
  const wsGroupMsg = rawGroupMsg?.isAnonymous
    ? applyAnonymousSenderPolicy(rawGroupMsg, null, null, { broadcast: true })
    : rawGroupMsg;

  fanout.emitToRoom(discussionRoom(pre.groupId), "message:new", wsGroupMsg);
  fanout.emitToRoom(discussionRoom(pre.groupId), "discussion:message:new", wsGroupMsg);

  for (const recipientUserId of result.popupRecipientIds) {
    fanout.emitToUser(recipientUserId, "notification:new", {
      type: "MESSAGE",
      groupId: pre.groupPublicId,
      messageId: rawGroupMsg.id,
      senderId: Number(socketUser.id),
      senderName: anonymousSafeSenderName(rawGroupMsg),
      createdAt: new Date().toISOString(),
    });
  }

  await emitUnreadUpdateToUsers(result.onlineNotViewingIds);

  void (async () => {
    const hasRecipients =
      (result.offlineIds?.length ?? 0) > 0 || (result.mentionUserIds?.length ?? 0) > 0;
    if (!hasRecipients) return;
    const groupRow = await prisma.discussionGroup.findUnique({
      where: { id: pre.groupId },
      select: { name: true },
    });
    await notifyOfflineOrMentionedByEmail({
      memberUserIds: result.memberIds,
      offlineIds: result.offlineIds,
      mentionUserIds: result.mentionUserIds,
      senderName: result.message?.sender?.full_name || "Someone",
      conversationLabel: groupRow?.name || "your conversation",
      plaintext: result.message?.content ?? "",
      href: `/dashboard/messages?server=${pre.groupId}`,
    });
  })().catch(() => {});

  metricTimerEnd("messages.send_total.ms", started);
  return ackSuccess(ack, {
    message: outGroupMsg,
    notification: {
      onlineRecipients: result.onlineNotViewingIds.length,
      offlineRecipients: result.offlineIds.length,
      popupRecipients: result.popupRecipientIds.length,
    },
  });
}
