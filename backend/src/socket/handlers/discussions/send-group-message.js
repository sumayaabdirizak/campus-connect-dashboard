import { metricTimerEnd } from "../../../features/discussions/reliability/metrics.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
} from "../../../features/discussions/discussionMessagePublic.js";
import { prisma } from "../../../db/prisma.js";
import { validateGroupMessagePreconditions } from "./send-group-message/groupValidate.js";
import { persistGroupMessageInTx } from "./send-group-message/groupPersist.js";

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
  const rawGroupMsg = result.message;
  const outGroupMsg = applyAnonymousSenderPolicy(rawGroupMsg, Number(socketUser.id), pre.membership);
  const wsGroupMsg = rawGroupMsg?.isAnonymous
    ? applyAnonymousSenderPolicy(rawGroupMsg, null, null, { broadcast: true })
    : rawGroupMsg;

  fanout.emitToRoom(discussionRoom(pre.groupId), "message:new", wsGroupMsg);
  fanout.emitToRoom(discussionRoom(pre.groupId), "discussion:message:new", wsGroupMsg);

  for (const recipientUserId of result.popupRecipientIds) {
    fanout.emitToUser(recipientUserId, "notification:new", {
      type: "MESSAGE",
      groupId: pre.groupId,
      messageId: result.message?.id,
      senderId: Number(socketUser.id),
      senderName: anonymousSafeSenderName(rawGroupMsg),
      createdAt: new Date().toISOString(),
    });
  }

  await emitUnreadUpdateToUsers(result.onlineNotViewingIds);
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
