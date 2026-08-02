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
import { filterMembershipRowsByChannelScope } from "../../../features/discussions/channelScopeAccess.js";
import { buildMessagePublicIdMap, toMessageDto } from "../../../controllers/discussions/messageShared.js";
import { notifyOfflineOrMentionedByEmail } from "./discussion-send/emailNotify.js";

/** @param {object} args */
export async function sendGroupDmMessage(args) {
  const {
    socket, payload, ack, groupDmId, groupDmPublicId,
    socketUser, fanout, ackOrEmitError, ackSuccess,
    discussionChannelRoom, discussionRoom, discussionGroupDmRoom,
    emitUnreadUpdateToUsers, isUserViewingChannel, isUserViewingGroup, isUserViewingGroupDm,
    getActiveDiscussionUserIdSet, getDiscussionMembership, touchDiscussionSession,
    started, attachmentIds, e2e, messageTypeUpper,
  } = args;

  const content = typeof payload?.content === "string" ? payload.content.trim() : "";
  const hasText = content.length > 0;
  if (!hasText) {
    return ackOrEmitError(socket, ack, "INVALID_MESSAGE", "content is required");
  }
  const gdmMember = await prisma.groupDmMember.findFirst({
    where: { groupDmId, userId: Number(socketUser.id), leftAt: null },
    include: { groupDm: { select: { id: true, archivedAt: true } } },
  });
  if (!gdmMember?.groupDm || gdmMember.groupDm.archivedAt) {
    return ackOrEmitError(socket, ack, "FORBIDDEN", "Not an active member of this group DM");
  }
  if (!gdmMember.canPost) {
    return ackOrEmitError(socket, ack, "FORBIDDEN", "Posting is disabled for you in this group DM");
  }
  const gdmResult = await prisma.$transaction(async (tx) => {
    const created = await tx.discussionMessage.create({
      data: {
        groupId: null,
        channelId: null,
        groupDmId,
        senderId: Number(socketUser.id),
        content,
        messageType: messageTypeUpper,
      },
      include: {
        sender: { select: { id: true, full_name: true } },
      },
    });
    const others = await tx.groupDmMember.findMany({
      where: { groupDmId, userId: { not: Number(socketUser.id) }, leftAt: null },
      select: {
        userId: true,
        user: { select: { number: true, full_name: true } },
      },
    });
    const memberRows = others.map((o) => ({
      userId: o.userId,
      number: o.user?.number ?? "",
      full_name: o.user?.full_name ?? "",
    }));
    const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));
    const otherIds = others.map((o) => Number(o.userId));
    const notViewingIds = otherIds.filter((id) => !isUserViewingGroupDm(id, groupDmId));
    const handles = extractMentionHandles(content);
    const mentionUserIds = new Set(
      resolveMentionUserIds(handles, memberRows, Number(socketUser.id)).filter((id) =>
        memberIdSet.has(id)
      )
    );
    const messageRecipients = notViewingIds.filter((rid) => !mentionUserIds.has(rid));
    if (messageRecipients.length > 0) {
      await tx.discussionNotification.createMany({
        data: messageRecipients.map((userId) => ({
          userId,
          groupId: null,
          messageId: created.id,
          type: "MESSAGE",
          payload: {
            groupDmId: groupDmPublicId,
            messageId: created.publicId,
            senderId: Number(socketUser.id),
            senderName: created.sender?.full_name ?? null,
          },
        })),
      });
    }
    const mentionRecipients = [...mentionUserIds].filter((id) => notViewingIds.includes(id));
    if (mentionRecipients.length > 0) {
      await tx.discussionNotification.createMany({
        data: mentionRecipients.map((userId) => ({
          userId,
          groupId: null,
          messageId: created.id,
          type: "MENTION",
          payload: {
            groupDmId: groupDmPublicId,
            messageId: created.publicId,
            senderId: Number(socketUser.id),
            senderName: created.sender?.full_name ?? null,
          },
        })),
      });
    }
    const activeUsers = await getActiveDiscussionUserIdSet(notViewingIds);
    const onlineNotViewingIds = notViewingIds.filter((id) => activeUsers.has(id));
    const offlineIds = notViewingIds.filter((id) => !activeUsers.has(id));
    let popupRecipientIds = onlineNotViewingIds;
    if (popupRecipientIds.length > 0) {
      popupRecipientIds = await excludeDoNotDisturbUserIds(tx, popupRecipientIds);
    }
    const full = await tx.discussionMessage.findUnique({
      where: { id: created.id },
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
        reactions: true,
      },
    });
    return {
      message: full,
      popupRecipientIds,
      onlineNotViewingIds,
      offlineIds,
      otherIds,
      mentionUserIds: [...mentionUserIds],
    };
  });
  await touchDiscussionSession(socket);
  const publicIdById = await buildMessagePublicIdMap(gdmResult.message ? [gdmResult.message] : []);
  const gdmOut = { ...toMessageDto(gdmResult.message, publicIdById), groupDmId: groupDmPublicId };
  fanout.emitToRoom(discussionGroupDmRoom(groupDmId), "message:new", gdmOut);
  fanout.emitToRoom(discussionGroupDmRoom(groupDmId), "groupdm:message:new", gdmOut);
  for (const recipientUserId of gdmResult.popupRecipientIds) {
    fanout.emitToUser(recipientUserId, "notification:new", {
      type: "MESSAGE",
      groupId: null,
      groupDmId: groupDmPublicId,
      messageId: gdmOut.id,
      senderId: Number(socketUser.id),
      senderName: gdmResult.message?.sender?.full_name ?? null,
      createdAt: new Date().toISOString(),
    });
  }
  await emitUnreadUpdateToUsers(gdmResult.onlineNotViewingIds);

  void (async () => {
    const hasRecipients =
      (gdmResult.offlineIds?.length ?? 0) > 0 || (gdmResult.mentionUserIds?.length ?? 0) > 0;
    if (!hasRecipients) return;
    const dmRow = await prisma.groupDm.findUnique({
      where: { id: groupDmId },
      select: { name: true },
    });
    await notifyOfflineOrMentionedByEmail({
      memberUserIds: gdmResult.otherIds,
      offlineIds: gdmResult.offlineIds,
      mentionUserIds: gdmResult.mentionUserIds,
      senderName: gdmResult.message?.sender?.full_name || "Someone",
      conversationLabel: dmRow?.name || "your conversation",
      plaintext: gdmResult.message?.content ?? "",
      href: `/dashboard/messages?dm=${groupDmPublicId}`,
    });
  })().catch(() => {});

  metricTimerEnd("messages.send_total.ms", started);
  return ackSuccess(ack, {
    message: gdmOut,
    notification: {
      onlineRecipients: gdmResult.onlineNotViewingIds.length,
      offlineRecipients: gdmResult.offlineIds.length,
      popupRecipients: gdmResult.popupRecipientIds.length,
    },
  });
}
