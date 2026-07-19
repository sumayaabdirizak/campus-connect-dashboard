import { extractMentionHandles, resolveMentionUserIds } from "../../../../features/discussions/mentionResolution.js";
import { excludeDoNotDisturbUserIds } from "../../../../features/discussions/discussionPresence.js";
import { anonymousSafeSenderName } from "../../../../features/discussions/discussionMessagePublic.js";

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {object} opts
 */
export async function createMemberMessageNotifications(tx, opts) {
  const {
    groupId,
    channelId,
    messageId,
    senderId,
    sender,
    isAnonymous,
    memberRows,
    notViewingIds,
    plaintext,
  } = opts;

  const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));
  const handles = extractMentionHandles(plaintext);
  const mentionUserIds = new Set(
    resolveMentionUserIds(handles, memberRows, senderId).filter((id) => memberIdSet.has(id)),
  );
  const senderName = anonymousSafeSenderName({ isAnonymous, sender });

  const messageRecipients = notViewingIds.filter((rid) => !mentionUserIds.has(rid));
  if (messageRecipients.length > 0) {
    await tx.discussionNotification.createMany({
      data: messageRecipients.map((userId) => ({
        userId,
        groupId,
        messageId,
        type: "MESSAGE",
        payload: {
          groupId,
          ...(channelId != null ? { channelId } : {}),
          messageId,
          senderId,
          senderName,
        },
      })),
    });
  }

  const mentionRecipients = [...mentionUserIds].filter((id) => notViewingIds.includes(id));
  if (mentionRecipients.length > 0) {
    await tx.discussionNotification.createMany({
      data: mentionRecipients.map((userId) => ({
        userId,
        groupId,
        messageId,
        type: "MENTION",
        payload: {
          groupId,
          ...(channelId != null ? { channelId } : {}),
          messageId,
          senderId,
          senderName,
        },
      })),
    });
  }
}

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {number[]} notViewingIds
 * @param {number} groupId
 * @param {(userId: number) => Promise<Set<number>>} getActiveDiscussionUserIdSet
 */
export async function resolvePopupRecipientIds(tx, notViewingIds, groupId, getActiveDiscussionUserIdSet) {
  const activeUsers = await getActiveDiscussionUserIdSet(notViewingIds);
  const onlineNotViewingIds = notViewingIds.filter((id) => activeUsers.has(id));
  const offlineIds = notViewingIds.filter((id) => !activeUsers.has(id));
  const mutedRows =
    onlineNotViewingIds.length > 0
      ? await tx.discussionMuteSetting.findMany({
          where: {
            userId: { in: onlineNotViewingIds },
            groupId,
            OR: [{ until: null }, { until: { gt: new Date() } }],
          },
          select: { userId: true },
        })
      : [];
  const mutedUserSet = new Set(mutedRows.map((row) => Number(row.userId)));
  let popupRecipientIds = onlineNotViewingIds.filter((id) => !mutedUserSet.has(id));
  if (popupRecipientIds.length > 0) {
    popupRecipientIds = await excludeDoNotDisturbUserIds(tx, popupRecipientIds);
  }
  return { popupRecipientIds, onlineNotViewingIds, offlineIds };
}
