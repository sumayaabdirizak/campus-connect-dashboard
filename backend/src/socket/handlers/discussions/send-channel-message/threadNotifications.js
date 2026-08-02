import {
  collectThreadParticipantSenderIds,
  resolveThreadRootMessageId,
} from "../../../../features/discussions/threadParticipants.js";
import { anonymousSafeSenderName } from "../../../../features/discussions/discussionMessagePublic.js";

/** @param {import("@prisma/client").Prisma.TransactionClient} tx @param {object} ctx */
export async function createChannelThreadNotifications(tx, ctx) {
  const { parentMessageId, channel, channelId, created, fields, socketUser } = ctx;
  if (parentMessageId == null) return;

  const serverId = channel.serverId;
  const rootId = await resolveThreadRootMessageId(tx, {
    groupId: serverId,
    channelId,
    replyParentMessageId: parentMessageId,
  });
  if (rootId == null) return;

  const threadTargets = await collectThreadParticipantSenderIds(tx, {
    groupId: serverId,
    channelId,
    rootMessageId: rootId,
    excludeUserId: Number(socketUser.id),
  });
  if (!threadTargets.length) return;

  const rootRow = await tx.discussionMessage.findUnique({
    where: { id: rootId },
    select: { publicId: true },
  });

  await tx.discussionNotification.createMany({
    data: threadTargets.map((uid) => ({
      userId: uid,
      groupId: serverId,
      messageId: created.id,
      type: "THREAD",
      payload: {
        groupId: channel.server.publicId,
        channelId: channel.publicId,
        messageId: created.publicId,
        threadRootMessageId: rootRow?.publicId ?? null,
        senderId: Number(socketUser.id),
        senderName: anonymousSafeSenderName({
          isAnonymous: fields.isAnonymous,
          sender: created.sender,
        }),
      },
    })),
  });
}
