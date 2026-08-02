import { filterMembershipRowsByChannelScope } from "../../../../features/discussions/channelScopeAccess.js";
import {
  createMemberMessageNotifications,
  resolvePopupRecipientIds,
} from "../discussion-send/notifications.js";
import { createChannelThreadNotifications } from "./threadNotifications.js";

/** @param {import("@prisma/client").Prisma.TransactionClient} tx @param {object} ctx */
export async function persistChannelMessageInTx(tx, ctx) {
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
