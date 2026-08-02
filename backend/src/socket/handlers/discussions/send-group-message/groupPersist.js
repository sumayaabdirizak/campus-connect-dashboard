import {
  createMemberMessageNotifications,
  resolvePopupRecipientIds,
} from "../discussion-send/notifications.js";

/** @param {import("@prisma/client").Prisma.TransactionClient} tx @param {object} ctx */
export async function persistGroupMessageInTx(tx, ctx) {
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
