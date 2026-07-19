import { prisma } from "../../../db/prisma.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "../../../features/discussions/permissions.js";

export function registerTypingHandlers(socket, ctx) {
  const {
    socketUser, ackOrEmitError, ackSuccess,
    discussionChannelRoom, discussionRoom,
    touchDiscussionSession, ensureTypingDisplayName, getDiscussionMembership,
  } = ctx;

      socket.on("typing:start", async (payload = {}, ack) => {
        const channelId = Number(payload?.channelId);
        if (Number.isFinite(channelId) && channelId > 0) {
          const perms = await computeChannelPermissions({ userId: socketUser.id, channelId });
          if (!hasPermission(perms, PERMISSION_BITS.VIEW_CHANNEL)) {
            return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a member");
          }
          const ch = await prisma.discussionChannel.findUnique({
            where: { id: channelId },
            select: { serverId: true },
          });
          if (!ch) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
          await touchDiscussionSession(socket);
          const userName = await ensureTypingDisplayName(socket, socketUser.id);
          socket
            .to(discussionChannelRoom(channelId))
            .emit("typing:update", {
              channelId,
              groupId: ch.serverId,
              userId: socketUser.id,
              userName,
              typing: true,
            });
          return ackSuccess(ack, { channelId });
        }
        const groupDmId = Number(payload?.groupDmId);
        if (Number.isFinite(groupDmId) && groupDmId > 0) {
          const member = await prisma.groupDmMember.findFirst({
            where: { groupDmId, userId: socketUser.id, leftAt: null },
            select: { id: true },
          });
          if (!member) return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a DM member");
          await touchDiscussionSession(socket);
          const userName = await ensureTypingDisplayName(socket, socketUser.id);
          socket.to(`groupdm:${groupDmId}`).emit("typing:update", {
            groupDmId,
            userId: socketUser.id,
            userName,
            typing: true,
          });
          return ackSuccess(ack, { groupDmId });
        }
        const groupId = Number(payload?.groupId);
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
        await touchDiscussionSession(socket);
        const userName = await ensureTypingDisplayName(socket, socketUser.id);
        socket
          .to(discussionRoom(groupId))
          .emit("typing:update", { groupId, userId: socketUser.id, userName, typing: true });
        return ackSuccess(ack, { groupId });
      });

      socket.on("typing:stop", async (payload = {}, ack) => {
        const channelId = Number(payload?.channelId);
        if (Number.isFinite(channelId) && channelId > 0) {
          const ch = await prisma.discussionChannel.findUnique({
            where: { id: channelId },
            select: { serverId: true },
          });
          if (!ch) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
          await touchDiscussionSession(socket);
          const userName = await ensureTypingDisplayName(socket, socketUser.id);
          socket
            .to(discussionChannelRoom(channelId))
            .emit("typing:update", {
              channelId,
              groupId: ch.serverId,
              userId: socketUser.id,
              userName,
              typing: false,
            });
          return ackSuccess(ack, { channelId });
        }
        const groupDmId = Number(payload?.groupDmId);
        if (Number.isFinite(groupDmId) && groupDmId > 0) {
          // Membership check skipped on stop — sender's own socket can always
          // tell others they've stopped, and `socket.to(...)` already excludes
          // the sender. Worst case: a noisy stop event for a left group.
          await touchDiscussionSession(socket);
          const userName = await ensureTypingDisplayName(socket, socketUser.id);
          socket.to(`groupdm:${groupDmId}`).emit("typing:update", {
            groupDmId,
            userId: socketUser.id,
            userName,
            typing: false,
          });
          return ackSuccess(ack, { groupDmId });
        }
        const groupId = Number(payload?.groupId);
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
        await touchDiscussionSession(socket);
        const userName = await ensureTypingDisplayName(socket, socketUser.id);
        socket
          .to(discussionRoom(groupId))
          .emit("typing:update", { groupId, userId: socketUser.id, userName, typing: false });
        return ackSuccess(ack, { groupId });
      });

}
