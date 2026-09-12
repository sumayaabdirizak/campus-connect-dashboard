import { prisma } from "../../../../db/prisma.js";
import { filterMembershipRowsByChannelScope } from "../../../../services/discussions/channelScopeAccess.js";
import { extractMentionHandles, resolveMentionUserIds } from "../../../../services/discussions/mentionResolution.js";
import { anonymousSafeSenderName } from "../../../../services/discussions/discussionMessagePublic.js";
import { REPLY_TO_INCLUDE } from "../../../../services/discussions/replyToMessage.js";

/**
 * Persist the channel message (+ attachment links) only.
 * Notification fan-out is intentionally separate so HTTP can return 201 quickly.
 */
export async function createChannelMessageTransaction({
  channel,
  channelId,
  userId,
  body,
  contentFields,
}) {
  const { isEncrypted, effectiveContent, messageType, isAnonymousFlag, hasText, attachmentIds } =
    contentFields;

  return prisma.$transaction(async (tx) => {
    const created = await tx.discussionMessage.create({
      data: {
        groupId: channel.serverId,
        channelId,
        senderId: userId,
        content: isEncrypted ? null : hasText ? effectiveContent : null,
        messageType,
        isAnonymous: isAnonymousFlag,
        parentMessageId: body.parentMessageId ?? null,
        replyToMessageId: body.replyToMessageId ?? null,
        keyVersion: body.e2e?.keyVersion ?? null,
        nonce: body.e2e?.nonce ?? null,
        ciphertext: body.e2e?.ciphertext ?? null,
        senderDeviceId: body.e2e?.senderDeviceId ?? null,
      },
      include: {
        sender: { select: { id: true, full_name: true, avatarUrl: true } },
        attachments: true,
        ...REPLY_TO_INCLUDE,
      },
    });

    if (attachmentIds.length > 0) {
      await tx.discussionAttachment.updateMany({
        where: { id: { in: attachmentIds }, uploadedById: userId, messageId: null },
        data: { messageId: created.id, groupId: channel.serverId, status: "LINKED" },
      });
    }

    const saved = await tx.discussionMessage.findUnique({
      where: { id: created.id },
      include: {
        sender: { select: { id: true, full_name: true, avatarUrl: true } },
        attachments: true,
        ...REPLY_TO_INCLUDE,
      },
    });
    return { message: saved };
  });
}

/**
 * Create DB notifications + socket event payloads after the send response.
 * Skips MESSAGE notifications for users already viewing the channel (socket parity).
 */
export async function createChannelMessageNotifications({
  channel,
  channelId,
  userId,
  message,
  contentFields,
  skipNotifyUserIds = null,
}) {
  const { isEncrypted, effectiveContent, isAnonymousFlag, hasText } = contentFields;
  const skipNotify =
    skipNotifyUserIds instanceof Set
      ? skipNotifyUserIds
      : new Set(
          Array.isArray(skipNotifyUserIds)
            ? skipNotifyUserIds.map(Number).filter((n) => Number.isFinite(n))
            : [],
        );

  const allRecipientRows = await prisma.discussionGroupMembership.findMany({
    where: { groupId: channel.serverId, leftAt: null, isActive: true, userId: { not: userId } },
    select: { userId: true, user: { select: { number: true, full_name: true } } },
  });
  const recipientRows = await filterMembershipRowsByChannelScope(allRecipientRows, channel);
  const memberRows = recipientRows.map((r) => ({
    userId: r.userId,
    number: r.user?.number ?? "",
    full_name: r.user?.full_name ?? "",
  }));
  const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));
  const recipientIds = recipientRows.map((r) => Number(r.userId)).filter(Boolean);
  const plaintext = isEncrypted ? "" : hasText ? effectiveContent : "";
  const handles = extractMentionHandles(plaintext);
  const mentionUserIds = new Set(
    resolveMentionUserIds(handles, memberRows, userId).filter((id) => memberIdSet.has(id)),
  );
  const messageRecipients = recipientIds.filter(
    (rid) => !mentionUserIds.has(rid) && !skipNotify.has(rid),
  );
  const senderName = anonymousSafeSenderName({
    isAnonymous: isAnonymousFlag,
    sender: message?.sender,
  });

  if (messageRecipients.length > 0) {
    await prisma.discussionNotification.createMany({
      data: messageRecipients.map((uid) => ({
        userId: uid,
        groupId: channel.serverId,
        messageId: message.id,
        type: "MESSAGE",
        payload: {
          groupId: channel.server.publicId,
          channelId: channel.publicId,
          messageId: message.publicId,
          senderId: userId,
          senderName,
        },
      })),
    });
  }
  if (mentionUserIds.size > 0) {
    await prisma.discussionNotification.createMany({
      data: [...mentionUserIds].map((recipientId) => ({
        userId: recipientId,
        groupId: channel.serverId,
        messageId: message.id,
        type: "MENTION",
        payload: {
          groupId: channel.server.publicId,
          channelId: channel.publicId,
          messageId: message.publicId,
          senderId: userId,
          senderName,
        },
      })),
    });
  }

  return [
    ...messageRecipients.map((uid) => ({
      userId: uid,
      notification: {
        type: "MESSAGE",
        groupId: channel.server.publicId,
        channelId: channel.publicId,
        messageId: message.publicId,
        senderId: userId,
        senderName,
      },
    })),
    ...[...mentionUserIds].map((uid) => ({
      userId: uid,
      notification: {
        type: "MENTION",
        groupId: channel.server.publicId,
        channelId: channel.publicId,
        messageId: message.publicId,
        senderId: userId,
        senderName,
      },
    })),
  ];
}
