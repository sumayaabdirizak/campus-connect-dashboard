import { prisma } from "../../../../db/prisma.js";
import { extractMentionHandles, resolveMentionUserIds } from "../../../../services/discussions/mentionResolution.js";
import { anonymousSafeSenderName } from "../../../../services/discussions/discussionMessagePublic.js";
import {
  collectThreadParticipantSenderIds,
  resolveThreadRootMessageId,
} from "../../../../services/discussions/threadParticipants.js";

export async function createGroupMessageTransaction({
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
}) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.discussionMessage.create({
      data: {
        groupId,
        senderId: userId,
        parentMessageId: parentMessageId ?? undefined,
        content: e2eeRequired ? null : hasText ? effectiveContent : null,
        messageType,
        isAnonymous: isAnonymousFlag,
        ciphertext: parsed.e2e?.ciphertext ?? null,
        nonce: parsed.e2e?.nonce ?? null,
        keyVersion: parsed.e2e?.keyVersion ?? null,
        senderDeviceId: parsed.e2e?.senderDeviceId ?? null,
      },
      include: { sender: { select: { id: true, full_name: true, avatarUrl: true } } },
    });

    if (attachmentIds.length > 0) {
      await tx.discussionAttachment.updateMany({
        where: { id: { in: attachmentIds }, uploadedById: userId, messageId: null },
        data: { messageId: created.id, groupId, status: "LINKED" },
      });
    }

    const members = await tx.discussionGroupMembership.findMany({
      where: { groupId, leftAt: null, isActive: true, userId: { not: userId } },
      select: { userId: true, user: { select: { id: true, number: true, full_name: true } } },
    });
    const memberRows = members.map((m) => ({
      userId: m.userId,
      number: m.user?.number ?? "",
      full_name: m.user?.full_name ?? "",
    }));
    const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));

    const plaintext = e2eeRequired ? "" : hasText ? effectiveContent : "";
    const handles = extractMentionHandles(plaintext);
    const mentionUserIds = new Set(
      resolveMentionUserIds(handles, memberRows, userId).filter((id) => memberIdSet.has(id)),
    );

    const recipientIds = members.map((member) => Number(member.userId));
    const messageRecipients = recipientIds.filter((rid) => !mentionUserIds.has(rid));
    const senderName = anonymousSafeSenderName({ isAnonymous: isAnonymousFlag, sender: created.sender });

    const groupPublicId = (await tx.discussionGroup.findUnique({
      where: { id: groupId },
      select: { publicId: true },
    }))?.publicId;

    if (messageRecipients.length) {
      await tx.discussionNotification.createMany({
        data: messageRecipients.map((recipientId) => ({
          userId: recipientId,
          groupId,
          messageId: created.id,
          type: "MESSAGE",
          payload: { groupId: groupPublicId, messageId: created.publicId, senderId: userId, senderName },
        })),
      });
    }
    if (mentionUserIds.size) {
      await tx.discussionNotification.createMany({
        data: [...mentionUserIds].map((recipientId) => ({
          userId: recipientId,
          groupId,
          messageId: created.id,
          type: "MENTION",
          payload: { groupId: groupPublicId, messageId: created.publicId, senderId: userId, senderName },
        })),
      });
    }

    if (parentMessageId != null) {
      const rootId = await resolveThreadRootMessageId(tx, {
        groupId,
        channelId: null,
        replyParentMessageId: parentMessageId,
      });
      if (rootId != null) {
        const threadTargets = await collectThreadParticipantSenderIds(tx, {
          groupId,
          channelId: null,
          rootMessageId: rootId,
          excludeUserId: userId,
        });
        if (threadTargets.length > 0) {
          const rootPublicId = (await tx.discussionMessage.findUnique({
            where: { id: rootId },
            select: { publicId: true },
          }))?.publicId;
          await tx.discussionNotification.createMany({
            data: threadTargets.map((uid) => ({
              userId: uid,
              groupId,
              messageId: created.id,
              type: "THREAD",
              payload: {
                groupId: groupPublicId,
                messageId: created.publicId,
                threadRootMessageId: rootPublicId,
                senderId: userId,
                senderName,
              },
            })),
          });
        }
      }
    }

    return created;
  });
}
