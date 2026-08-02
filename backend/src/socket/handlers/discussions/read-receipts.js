import { prisma } from "../../../db/prisma.js";
import { resolveGroupDmRow } from "../../../controllers/discussions/groupDms/helpers.js";
import { resolveServerRow, resolveChannelRow } from "../../../controllers/discussions/serverShared.js";
import { resolveMessageRow } from "../../../controllers/discussions/messageShared.js";

export function registerReadReceiptHandlers(socket, ctx) {
  const {
    io,
    socketUser,
    ackOrEmitError,
    ackSuccess,
    discussionChannelRoom,
    discussionRoom,
    touchDiscussionSession,
    getDiscussionMembership,
    emitUnreadUpdateToUsers,
  } = ctx;

  socket.on("message:read", async (payload = {}, ack) => {
    try {
      let groupId = null;
      let groupPublicId = null;
      const isDmScope = payload?.groupDmId != null;
      const groupDmRow = isDmScope ? await resolveGroupDmRow(payload.groupDmId) : null;
      if (isDmScope && !groupDmRow) {
        return ackOrEmitError(socket, ack, "INVALID_GROUP_DM", "groupDmId is invalid");
      }
      const groupDmId = groupDmRow?.id ?? null;

      const channelRow = payload?.channelId != null ? await resolveChannelRow(payload.channelId) : null;
      const channelId = channelRow?.id ?? null;
      let channelPublicId = channelRow?.publicId ?? null;

      if (channelRow) {
        const ch = await prisma.discussionChannel.findUnique({
          where: { id: channelId },
          select: { serverId: true, server: { select: { publicId: true } } },
        });
        if (!ch) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
        groupId = ch.serverId;
        groupPublicId = ch.server.publicId;
      } else if (!isDmScope) {
        const groupRow = await resolveServerRow(payload?.groupId);
        if (groupRow) {
          groupId = groupRow.id;
          groupPublicId = groupRow.publicId;
        }
      }
      const messageRow = payload?.messageId != null ? await resolveMessageRow(payload.messageId) : null;
      const messageId = messageRow?.id ?? null;

      // DM scope: validate via GroupDmMember; legacy/channel scope: via group membership.
      if (isDmScope) {
        const member = await prisma.groupDmMember.findFirst({
          where: { groupDmId, userId: Number(socketUser.id), leftAt: null },
          select: { id: true },
        });
        if (!member) return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a DM member");
      } else {
        if (!Number.isFinite(groupId)) {
          return ackOrEmitError(
            socket,
            ack,
            "INVALID_GROUP",
            "groupId, channelId or groupDmId is required"
          );
        }
        const membership = await getDiscussionMembership(groupId, socketUser.id);
        if (!membership) return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a member");
      }

      if (messageId != null) {
        await prisma.discussionReadReceipt.upsert({
          where: {
            messageId_userId: {
              messageId,
              userId: Number(socketUser.id),
            },
          },
          create: {
            messageId,
            userId: Number(socketUser.id),
            readAt: new Date(),
          },
          update: { readAt: new Date() },
        });
      }

      // Notification clearing only applies to channel/server scope; DM
      // notifications are cleared by the dedicated mark-read endpoint.
      if (!isDmScope) {
        const notificationWhere = {
          userId: Number(socketUser.id),
          readAt: null,
          groupId,
        };
        if (payload?.upToCreatedAt) {
          const parsed = new Date(payload.upToCreatedAt);
          if (!Number.isNaN(parsed.getTime())) {
            notificationWhere.createdAt = { lte: parsed };
          }
        }
        await prisma.discussionNotification.updateMany({
          where: notificationWhere,
          data: { readAt: new Date() },
        });
      }

      await touchDiscussionSession(socket);
      const update = {
        groupId: isDmScope ? null : groupPublicId,
        channelId: channelPublicId,
        groupDmId: isDmScope ? groupDmRow.publicId : null,
        messageId: messageRow?.publicId ?? null,
        userId: Number(socketUser.id),
        readAt: new Date().toISOString(),
      };
      if (isDmScope) {
        io.to(`groupdm:${groupDmId}`).emit("message:read:update", update);
      } else {
        io.to(discussionRoom(groupId)).emit("message:read:update", update);
        if (Number.isFinite(channelId) && channelId > 0) {
          io.to(discussionChannelRoom(channelId)).emit("message:read:update", update);
        }
      }
      await emitUnreadUpdateToUsers([Number(socketUser.id)]);
      return ackSuccess(ack, update);
    } catch (error) {
      console.error("message:read failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to update read receipt");
    }
  });
}
