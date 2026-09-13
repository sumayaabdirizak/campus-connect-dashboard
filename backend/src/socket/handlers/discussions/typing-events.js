import { prisma } from "../../../db/prisma.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "../../../services/discussions/permissions.js";
import { resolveGroupDmRow } from "../../../controllers/discussions/groupDms/helpers.js";
import { resolveServerRow, resolveChannelRow } from "../../../controllers/discussions/serverShared.js";

export function registerTypingHandlers(socket, ctx) {
  const {
    socketUser,
    ackOrEmitError,
    ackSuccess,
    discussionChannelRoom,
    discussionRoom,
    touchDiscussionSession,
    ensureTypingDisplayName,
    getDiscussionMembership,
  } = ctx;

  socket.on("typing:start", async (payload = {}, ack) => {
    if (payload?.channelId != null) {
      const channelRow = await resolveChannelRow(payload.channelId);
      if (!channelRow) return ackOrEmitError(socket, ack, "INVALID_CHANNEL", "channelId is invalid");
      const channelId = channelRow.id;
      const perms = await computeChannelPermissions({ userId: socketUser.id, channelId });
      if (!hasPermission(perms, PERMISSION_BITS.VIEW_CHANNEL)) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a member");
      }
      const ch = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true, server: { select: { publicId: true } } },
      });
      if (!ch) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
      await touchDiscussionSession(socket);
      const userName = await ensureTypingDisplayName(socket, socketUser.id);
      socket.to(discussionChannelRoom(channelId)).emit("typing:update", {
        channelId: channelRow.publicId,
        groupId: ch.server.publicId,
        userId: socketUser.id,
        userName,
        typing: true,
      });
      return ackSuccess(ack, { channelId: channelRow.publicId });
    }

    if (payload?.groupDmId != null) {
      const row = await resolveGroupDmRow(payload.groupDmId);
      if (!row) return ackOrEmitError(socket, ack, "INVALID_GROUP_DM", "groupDmId is invalid");
      const member = await prisma.groupDmMember.findFirst({
        where: { groupDmId: row.id, userId: socketUser.id, leftAt: null },
        select: { id: true },
      });
      if (!member) return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a DM member");
      await touchDiscussionSession(socket);
      const userName = await ensureTypingDisplayName(socket, socketUser.id);
      socket.to(`groupdm:${row.id}`).emit("typing:update", {
        groupDmId: row.publicId,
        userId: socketUser.id,
        userName,
        typing: true,
      });
      return ackSuccess(ack, { groupDmId: row.publicId });
    }

    const groupRow = await resolveServerRow(payload?.groupId);
    if (!groupRow) {
      return ackOrEmitError(
        socket,
        ack,
        "INVALID_GROUP",
        "groupId, channelId, or groupDmId is required"
      );
    }
    const groupId = groupRow.id;
    const membership = await getDiscussionMembership(groupId, socketUser.id);
    if (!membership) return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a member");
    await touchDiscussionSession(socket);
    const userName = await ensureTypingDisplayName(socket, socketUser.id);
    socket
      .to(discussionRoom(groupId))
      .emit("typing:update", { groupId: groupRow.publicId, userId: socketUser.id, userName, typing: true });
    return ackSuccess(ack, { groupId: groupRow.publicId });
  });

  socket.on("typing:stop", async (payload = {}, ack) => {
    if (payload?.channelId != null) {
      const channelRow = await resolveChannelRow(payload.channelId);
      if (!channelRow) return ackOrEmitError(socket, ack, "INVALID_CHANNEL", "channelId is invalid");
      const channelId = channelRow.id;
      const ch = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true, server: { select: { publicId: true } } },
      });
      if (!ch) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
      await touchDiscussionSession(socket);
      const userName = await ensureTypingDisplayName(socket, socketUser.id);
      socket.to(discussionChannelRoom(channelId)).emit("typing:update", {
        channelId: channelRow.publicId,
        groupId: ch.server.publicId,
        userId: socketUser.id,
        userName,
        typing: false,
      });
      return ackSuccess(ack, { channelId: channelRow.publicId });
    }

    if (payload?.groupDmId != null) {
      const row = await resolveGroupDmRow(payload.groupDmId);
      if (!row) return ackOrEmitError(socket, ack, "INVALID_GROUP_DM", "groupDmId is invalid");
      await touchDiscussionSession(socket);
      const userName = await ensureTypingDisplayName(socket, socketUser.id);
      socket.to(`groupdm:${row.id}`).emit("typing:update", {
        groupDmId: row.publicId,
        userId: socketUser.id,
        userName,
        typing: false,
      });
      return ackSuccess(ack, { groupDmId: row.publicId });
    }

    const groupRow = await resolveServerRow(payload?.groupId);
    if (!groupRow) {
      return ackOrEmitError(
        socket,
        ack,
        "INVALID_GROUP",
        "groupId, channelId, or groupDmId is required"
      );
    }
    const groupId = groupRow.id;
    const membership = await getDiscussionMembership(groupId, socketUser.id);
    if (!membership) return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a member");
    await touchDiscussionSession(socket);
    const userName = await ensureTypingDisplayName(socket, socketUser.id);
    socket
      .to(discussionRoom(groupId))
      .emit("typing:update", { groupId: groupRow.publicId, userId: socketUser.id, userName, typing: false });
    return ackSuccess(ack, { groupId: groupRow.publicId });
  });
}
