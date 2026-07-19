import { prisma } from "../../../db/prisma.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "../../../features/discussions/permissions.js";

export function registerReadReceiptHandlers(socket, ctx) {
  const {
    socketUser, fanout, ackOrEmitError, ackSuccess,
    discussionChannelRoom, discussionRoom,
    touchDiscussionSession, getDiscussionMembership,
  } = ctx;

      socket.on("message:read", async (payload = {}, ack) => {
        try {
          let groupId = Number(payload?.groupId);
          const channelId = Number(payload?.channelId);
          const groupDmId = Number(payload?.groupDmId);
          const isDmScope = Number.isFinite(groupDmId) && groupDmId > 0;

          if (Number.isFinite(channelId) && channelId > 0) {
            const ch = await prisma.discussionChannel.findUnique({
              where: { id: channelId },
              select: { serverId: true },
            });
            if (!ch) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
            groupId = ch.serverId;
          }
          const messageId = Number(payload?.messageId);

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

          if (Number.isFinite(messageId)) {
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
            groupId: isDmScope ? null : groupId,
            channelId: Number.isFinite(channelId) && channelId > 0 ? channelId : null,
            groupDmId: isDmScope ? groupDmId : null,
            messageId: Number.isFinite(messageId) ? messageId : null,
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
