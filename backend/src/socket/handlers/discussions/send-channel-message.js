import { metricTimerEnd } from "../../../services/discussions/reliability/metrics.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
} from "../../../services/discussions/discussionMessagePublic.js";
import { prisma } from "../../../db/prisma.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "../../../services/discussions/permissions.js";
import {
  deriveDiscussionMessageFields,
  validatePendingAttachments,
  validateE2ePayload,
} from "./discussion-send/contentAndValidation.js";
import { whereFromParam } from "../../../services/discussions/publicIdResolution.js";
import { filterMembershipRowsByChannelScope } from "../../../services/discussions/channelScopeAccess.js";
import {
  createMemberMessageNotifications,
  resolvePopupRecipientIds,
} from "./discussion-send/notifications.js";
import {
  collectThreadParticipantSenderIds,
  resolveThreadRootMessageId,
} from "../../../services/discussions/threadParticipants.js";
import { notifyOfflineOrMentionedByEmail } from "./discussion-send/emailNotify.js";
import { buildMessagePublicIdMap, toMessageDto } from "../../../controllers/discussions/messageShared.js";

/** @param {object} args */
async function validateChannelMessagePreconditions(args) {
  const { socket, ack, channelId, socketUser, ackOrEmitError, attachmentIds, e2e, payload } = args;

  const rawContent = typeof payload?.content === "string" ? payload.content : "";

  const channel = await prisma.discussionChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      publicId: true,
      name: true,
      serverId: true,
      scopeType: true,
      scopeId: true,
      server: { select: { id: true, publicId: true, e2eeEnabled: true } },
    },
  });
  if (!channel) return { ok: false, ack: () => ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found") };

  const perms = await computeChannelPermissions({ userId: socketUser.id, channelId });
  if (!hasPermission(perms, PERMISSION_BITS.SEND_MESSAGES)) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "FORBIDDEN", "Cannot send in this channel") };
  }

  const e2eeEnabled = channel.server?.e2eeEnabled !== false;
  const e2eCheck = validateE2ePayload(e2eeEnabled, e2e, "channels");
  if (!e2eCheck.ok) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, e2eCheck.code, e2eCheck.message) };
  }

  const attachCheck = await validatePendingAttachments(
    prisma,
    attachmentIds,
    Number(socketUser.id),
    channel.serverId,
  );
  if (!attachCheck.ok) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, attachCheck.code, attachCheck.message) };
  }

  let parentMessageId = null;
  if (payload?.parentMessageId != null) {
    const parentWhere = whereFromParam(payload.parentMessageId);
    const parent = parentWhere
      ? await prisma.discussionMessage.findFirst({
          where: { ...parentWhere, channelId, deletedAt: null, parentMessageId: null },
          select: { id: true },
        })
      : null;
    if (!parent) {
      return {
        ok: false,
        ack: () =>
          ackOrEmitError(socket, ack, "INVALID_PARENT", "parentMessageId must be a root message in this channel"),
      };
    }
    parentMessageId = parent.id;
  }

  const fields = deriveDiscussionMessageFields(
    e2eeEnabled,
    rawContent,
    args.messageTypeUpper,
    payload,
    parentMessageId,
  );
  const createdMessageType =
    attachmentIds.length > 0 && !fields.hasText ? "MEDIA" : fields.messageType;
  if (createdMessageType === "QUESTION" && !fields.hasText) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_MESSAGE", "Question text is required") };
  }
  if (!fields.hasText && attachmentIds.length === 0) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_MESSAGE", "content or attachmentIds required") };
  }

  return { ok: true, channel, parentMessageId, e2eeEnabled, fields, createdMessageType };
}

/** @param {import("@prisma/client").Prisma.TransactionClient} tx @param {object} ctx */
async function createChannelThreadNotifications(tx, ctx) {
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

/** @param {import("@prisma/client").Prisma.TransactionClient} tx @param {object} ctx */
async function persistChannelMessageInTx(tx, ctx) {
  const {
    channel,
    channelId,
    socketUser,
    parentMessageId,
    e2eeEnabled,
    fields,
    createdMessageType,
    attachmentIds,
    e2e,
    isUserViewingChannel,
    getActiveDiscussionUserIdSet,
  } = ctx;

  const serverId = channel.serverId;
  const created = await tx.discussionMessage.create({
    data: {
      groupId: serverId,
      channelId,
      senderId: Number(socketUser.id),
      content: e2eeEnabled ? null : fields.hasText ? fields.effectiveContent : null,
      messageType: createdMessageType,
      isAnonymous: fields.isAnonymous,
      parentMessageId: parentMessageId ?? undefined,
      ciphertext: e2e?.ciphertext ?? null,
      nonce: e2e?.nonce ?? null,
      keyVersion: Number.isFinite(Number(e2e?.keyVersion)) ? Number(e2e.keyVersion) : null,
      senderDeviceId: typeof e2e?.senderDeviceId === "string" ? e2e.senderDeviceId : null,
    },
    include: { sender: { select: { id: true, full_name: true } } },
  });

  if (attachmentIds.length > 0) {
    await tx.discussionAttachment.updateMany({
      where: { id: { in: attachmentIds }, uploadedById: Number(socketUser.id), messageId: null },
      data: { messageId: created.id, groupId: serverId, status: "LINKED" },
    });
  }

  const allMembers = await tx.discussionGroupMembership.findMany({
    where: {
      groupId: serverId,
      leftAt: null,
      isActive: true,
      userId: { not: Number(socketUser.id) },
    },
    select: { userId: true, user: { select: { number: true, full_name: true } } },
  });
  const members = await filterMembershipRowsByChannelScope(allMembers, channel, tx);
  const memberRows = members.map((m) => ({
    userId: m.userId,
    number: m.user?.number ?? "",
    full_name: m.user?.full_name ?? "",
  }));
  const memberIds = members.map((m) => Number(m.userId));
  const notViewingIds = memberIds.filter((id) => !isUserViewingChannel(id, channelId));
  const plaintext = e2eeEnabled ? "" : fields.hasText ? fields.effectiveContent : "";

  const { mentionUserIds } = await createMemberMessageNotifications(tx, {
    groupId: serverId,
    channelId,
    messageId: created.id,
    groupPublicId: channel.server.publicId,
    channelPublicId: channel.publicId,
    messagePublicId: created.publicId,
    senderId: Number(socketUser.id),
    sender: created.sender,
    isAnonymous: fields.isAnonymous,
    memberRows,
    notViewingIds,
    plaintext,
  });

  await createChannelThreadNotifications(tx, {
    parentMessageId,
    channel,
    channelId,
    created,
    fields,
    socketUser,
  });

  const presence = await resolvePopupRecipientIds(
    tx,
    notViewingIds,
    serverId,
    getActiveDiscussionUserIdSet,
  );
  const full = await tx.discussionMessage.findUnique({
    where: { id: created.id },
    include: { sender: { select: { id: true, full_name: true } }, attachments: true },
  });
  return { message: full, serverId, memberIds, mentionUserIds, plaintext, ...presence };
}

/** @param {object} args */
export async function sendChannelMessage(args) {
  const {
    socket, ack, channelId, channelPublicId,
    socketUser, fanout, ackSuccess,
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
