import { metricTimerEnd } from "../../../services/discussions/reliability/metrics.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
} from "../../../services/discussions/discussionMessagePublic.js";
import { prisma } from "../../../db/prisma.js";
import {
  deriveDiscussionMessageFields,
  validatePendingAttachments,
  validateE2ePayload,
} from "./discussion-send/contentAndValidation.js";
import { resolveServerRow } from "../../../controllers/discussions/serverShared.js";
import { whereFromParam } from "../../../services/discussions/publicIdResolution.js";
import {
  createMemberMessageNotifications,
  resolvePopupRecipientIds,
} from "./discussion-send/notifications.js";
import { notifyOfflineOrMentionedByEmail } from "./discussion-send/emailNotify.js";
import { buildMessagePublicIdMap, toMessageDto } from "../../../controllers/discussions/messageShared.js";

/** @param {object} args */
async function validateGroupMessagePreconditions(args) {
  const { socket, payload, ack, socketUser, ackOrEmitError, attachmentIds, e2e, getDiscussionMembership } = args;

  const groupRow = await resolveServerRow(payload?.groupId);
  if (!groupRow) {
    return {
      ok: false,
      ack: () =>
        ackOrEmitError(socket, ack, "INVALID_GROUP", "groupId or channelId or groupDmId is required"),
    };
  }
  const groupId = groupRow.id;

  const membership = await getDiscussionMembership(groupId, socketUser.id);
  if (!membership) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "FORBIDDEN", "User is not a member of this group") };
  }
  if (!membership.canPost) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "FORBIDDEN", "Posting is disabled for this user") };
  }

  let parentMessageId = null;
  if (payload?.parentMessageId != null) {
    const parentWhere = whereFromParam(payload.parentMessageId);
    const parent = parentWhere
      ? await prisma.discussionMessage.findFirst({
          where: { ...parentWhere, groupId, deletedAt: null },
          select: { id: true },
        })
      : null;
    if (!parent) {
      return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_PARENT", "parentMessageId not found in this group") };
    }
    parentMessageId = parent.id;
  }

  const e2eeEnabled = membership.group?.e2eeEnabled !== false;
  const e2eCheck = validateE2ePayload(e2eeEnabled, e2e, "groups");
  if (!e2eCheck.ok) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, e2eCheck.code, e2eCheck.message) };
  }

  const attachCheck = await validatePendingAttachments(prisma, attachmentIds, Number(socketUser.id), groupId);
  if (!attachCheck.ok) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, attachCheck.code, attachCheck.message) };
  }

  const rawContent = typeof payload?.content === "string" ? payload.content : "";
  const fields = deriveDiscussionMessageFields(
    e2eeEnabled,
    rawContent,
    args.messageTypeUpper,
    payload,
    parentMessageId,
  );
  const messageType = attachmentIds.length > 0 && !fields.hasText ? "MEDIA" : fields.messageType;
  if (!fields.hasText && attachmentIds.length === 0) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_MESSAGE", "content or attachmentIds required") };
  }
  if (messageType === "QUESTION" && !fields.hasText) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_MESSAGE", "Question text is required") };
  }

  return { ok: true, groupId, groupPublicId: groupRow.publicId, membership, parentMessageId, e2eeEnabled, fields, messageType };
}

/** @param {import("@prisma/client").Prisma.TransactionClient} tx @param {object} ctx */
async function persistGroupMessageInTx(tx, ctx) {
  const {
    groupId,
    groupPublicId,
    socketUser,
    parentMessageId,
    e2eeEnabled,
    fields,
    messageType,
    attachmentIds,
    e2e,
    isUserViewingGroup,
    getActiveDiscussionUserIdSet,
  } = ctx;

  const created = await tx.discussionMessage.create({
    data: {
      groupId,
      senderId: Number(socketUser.id),
      parentMessageId: parentMessageId ?? undefined,
      content: e2eeEnabled ? null : fields.hasText ? fields.effectiveContent : null,
      messageType,
      isAnonymous: fields.isAnonymous,
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
      data: { messageId: created.id, groupId, status: "LINKED" },
    });
  }

  const members = await tx.discussionGroupMembership.findMany({
    where: {
      groupId,
      leftAt: null,
      isActive: true,
      userId: { not: Number(socketUser.id) },
    },
    select: { userId: true, user: { select: { id: true, number: true, full_name: true } } },
  });
  const memberRows = members.map((m) => ({
    userId: m.userId,
    number: m.user?.number ?? "",
    full_name: m.user?.full_name ?? "",
  }));
  const memberIds = members.map((m) => Number(m.userId));
  const notViewingIds = memberIds.filter((id) => !isUserViewingGroup(id, groupId));
  const plaintext = e2eeEnabled ? "" : fields.hasText ? fields.effectiveContent : "";

  const { mentionUserIds } = await createMemberMessageNotifications(tx, {
    groupId,
    channelId: null,
    messageId: created.id,
    groupPublicId,
    messagePublicId: created.publicId,
    senderId: Number(socketUser.id),
    sender: created.sender,
    isAnonymous: fields.isAnonymous,
    memberRows,
    notViewingIds,
    plaintext,
  });

  const presence = await resolvePopupRecipientIds(
    tx,
    notViewingIds,
    groupId,
    getActiveDiscussionUserIdSet,
  );
  const full = await tx.discussionMessage.findUnique({
    where: { id: created.id },
    include: { sender: { select: { id: true, full_name: true } }, attachments: true },
  });
  return { message: full, memberIds, mentionUserIds, plaintext, ...presence };
}

/** @param {object} args */
export async function sendGroupMessage(args) {
  const {
    socket, ack,
    socketUser, fanout, ackSuccess,
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
