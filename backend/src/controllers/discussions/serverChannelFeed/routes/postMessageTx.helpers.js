import { prisma } from "../../../../db/prisma.js";
import { filterMembershipRowsByChannelScope } from "../../../../features/discussions/channelScopeAccess.js";
import { extractMentionHandles, resolveMentionUserIds } from "../../../../features/discussions/mentionResolution.js";
import { anonymousSafeSenderName } from "../../../../features/discussions/discussionMessagePublic.js";

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
        keyVersion: body.e2e?.keyVersion ?? null,
        nonce: body.e2e?.nonce ?? null,
        ciphertext: body.e2e?.ciphertext ?? null,
        senderDeviceId: body.e2e?.senderDeviceId ?? null,
      },
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
      },
    });

    if (attachmentIds.length > 0) {
      await tx.discussionAttachment.updateMany({
        where: { id: { in: attachmentIds }, uploadedById: userId, messageId: null },
        data: { messageId: created.id, groupId: channel.serverId, status: "LINKED" },
      });
    }

    const allRecipientRows = await tx.discussionGroupMembership.findMany({
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
    const messageRecipients = recipientIds.filter((rid) => !mentionUserIds.has(rid));
    const senderName = anonymousSafeSenderName({ isAnonymous: isAnonymousFlag, sender: created.sender });

    if (messageRecipients.length > 0) {
      await tx.discussionNotification.createMany({
        data: messageRecipients.map((uid) => ({
          userId: uid,
          groupId: channel.serverId,
          messageId: created.id,
          type: "MESSAGE",
          payload: { groupId: channel.serverId, channelId, messageId: created.id, senderId: userId, senderName },
        })),
      });
    }
    if (mentionUserIds.size > 0) {
      await tx.discussionNotification.createMany({
        data: [...mentionUserIds].map((recipientId) => ({
          userId: recipientId,
          groupId: channel.serverId,
          messageId: created.id,
          type: "MENTION",
          payload: { groupId: channel.serverId, channelId, messageId: created.id, senderId: userId, senderName },
        })),
      });
    }

    const notificationEvents = [
      ...messageRecipients.map((uid) => ({
        userId: uid,
        notification: {
          type: "MESSAGE",
          groupId: channel.serverId,
          channelId,
          messageId: created.id,
          senderId: userId,
          senderName,
        },
      })),
      ...[...mentionUserIds].map((uid) => ({
        userId: uid,
        notification: {
          type: "MENTION",
          groupId: channel.serverId,
          channelId,
          messageId: created.id,
          senderId: userId,
          senderName,
        },
      })),
    ];

    const saved = await tx.discussionMessage.findUnique({
      where: { id: created.id },
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
      },
    });
    return { message: saved, notificationEvents };
  });
}
