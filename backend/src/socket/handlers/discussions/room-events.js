import { prisma } from "../../../db/prisma.js";
import { buildUnreadSocketPayload } from "../../../features/discussions/buildUnreadPayload.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "../../../features/discussions/permissions.js";

/**
 * join/leave for groups, channels, and group DMs.
 * @param {import("socket.io").Socket} socket
 * @param {object} ctx
 */
export function registerRoomEventHandlers(socket, ctx) {
  const {
    io,
    socketUser,
    ackOrEmitError,
    ackSuccess,
    discussionRoom,
    discussionChannelRoom,
    discussionGroupDmRoom,
    rememberDiscussionRoom,
    forgetDiscussionRoom,
    rememberGroupDmRoom,
    forgetGroupDmRoom,
    getDiscussionMembership,
    touchDiscussionSession,
  } = ctx;

  socket.on("join:group", async (payload = {}, ack) => {
    try {
      const groupId = Number(payload?.groupId);
      if (!Number.isFinite(groupId)) {
        return ackOrEmitError(socket, ack, "INVALID_GROUP", "groupId is required");
      }
      const membership = await getDiscussionMembership(groupId, socketUser.id);
      if (!membership) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "User is not a member of this group");
      }
      const room = discussionRoom(groupId);
      socket.join(room);
      socket.data.discussionRooms.add(groupId);
      rememberDiscussionRoom(socketUser.id, groupId);
      await touchDiscussionSession(socket);

      try {
        await prisma.discussionNotification.updateMany({
          where: { userId: Number(socketUser.id), groupId, readAt: null },
          data: { readAt: new Date() },
        });
        const unreadPayload = await buildUnreadSocketPayload(Number(socketUser.id));
        io.to(`user:${Number(socketUser.id)}`).emit("unread:update", unreadPayload);
      } catch (e) {
        console.warn("join:group mark notifications read:", e?.message || e);
      }

      const joinedPayload = {
        groupId,
        myRole: membership.role,
        myCanPost: membership.canPost,
        myCanModerate: membership.canModerate,
        e2eeEnabled: membership.group?.e2eeEnabled ?? true,
        e2eeCurrentKeyVersion: membership.group?.e2eeCurrentKeyVersion ?? 1,
        e2eeRotationRequired: membership.group?.e2eeRotationRequired ?? false,
      };
      const requestDeviceId = typeof payload?.deviceId === "string" ? payload.deviceId : null;
      if (requestDeviceId) {
        const envelopes = await prisma.discussionGroupKeyEnvelope.findMany({
          where: {
            groupId,
            userId: Number(socketUser.id),
            deviceId: requestDeviceId,
            ...(Number.isFinite(Number(payload?.fromVersion))
              ? { keyVersion: { gt: Number(payload.fromVersion) } }
              : {}),
          },
          orderBy: [{ keyVersion: "asc" }, { createdAt: "asc" }],
          take: 50,
        });
        joinedPayload.e2eKeyEnvelopes = envelopes;
      }
      socket.data.activeDiscussionGroupId = groupId;
      socket.data.activeDiscussionGroupDmId = null;
      socket.emit("group:joined", joinedPayload);
      return ackSuccess(ack, joinedPayload);
    } catch (error) {
      console.error("join:group failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to join group");
    }
  });

  socket.on("leave:group", (payload = {}, ack) => {
    const groupId = Number(payload?.groupId);
    if (!Number.isFinite(groupId)) {
      return ackOrEmitError(socket, ack, "INVALID_GROUP", "groupId is required");
    }
    socket.leave(discussionRoom(groupId));
    socket.data.discussionRooms.delete(groupId);
    if (Number(socket.data.activeDiscussionGroupId) === groupId) {
      socket.data.activeDiscussionGroupId = null;
    }
    forgetDiscussionRoom(socketUser.id, groupId);
    return ackSuccess(ack, { groupId });
  });

  socket.on("channel:join", async (payload = {}, ack) => {
    try {
      const channelId = Number(payload?.channelId);
      if (!Number.isFinite(channelId) || channelId <= 0) {
        return ackOrEmitError(socket, ack, "INVALID_CHANNEL", "channelId is required");
      }
      const perms = await computeChannelPermissions({ userId: socketUser.id, channelId });
      if (!hasPermission(perms, PERMISSION_BITS.VIEW_CHANNEL)) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "Cannot view this channel");
      }
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { id: true, serverId: true },
      });
      if (!channel) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
      socket.join(discussionChannelRoom(channelId));
      socket.data.discussionChannelRooms.add(channelId);
      socket.data.activeDiscussionChannelId = channelId;
      socket.data.activeDiscussionGroupId = channel.serverId;
      socket.data.activeDiscussionGroupDmId = null;
      await touchDiscussionSession(socket);
      return ackSuccess(ack, { channelId, serverId: channel.serverId });
    } catch (error) {
      console.error("channel:join failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to join channel");
    }
  });

  socket.on("channel:leave", (payload = {}, ack) => {
    const channelId = Number(payload?.channelId);
    if (!Number.isFinite(channelId) || channelId <= 0) {
      return ackOrEmitError(socket, ack, "INVALID_CHANNEL", "channelId is required");
    }
    socket.leave(discussionChannelRoom(channelId));
    socket.data.discussionChannelRooms.delete(channelId);
    if (Number(socket.data.activeDiscussionChannelId) === channelId) {
      socket.data.activeDiscussionChannelId = null;
    }
    return ackSuccess(ack, { channelId });
  });

  socket.on("groupdm:join", async (payload = {}, ack) => {
    try {
      const groupDmId = Number(payload?.groupDmId);
      if (!Number.isFinite(groupDmId) || groupDmId <= 0) {
        return ackOrEmitError(socket, ack, "INVALID_GROUP_DM", "groupDmId is required");
      }
      const member = await prisma.groupDmMember.findFirst({
        where: { groupDmId, userId: Number(socketUser.id), leftAt: null },
        include: { groupDm: { select: { id: true, archivedAt: true } } },
      });
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a member of this group DM");
      }
      socket.join(discussionGroupDmRoom(groupDmId));
      socket.data.discussionGroupDmRooms.add(groupDmId);
      socket.data.activeDiscussionGroupDmId = groupDmId;
      socket.data.activeDiscussionChannelId = null;
      rememberGroupDmRoom(socketUser.id, groupDmId);
      await touchDiscussionSession(socket);
      return ackSuccess(ack, { groupDmId, myRole: member.role, canPost: member.canPost });
    } catch (error) {
      console.error("groupdm:join failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to join group DM");
    }
  });

  socket.on("groupdm:leave", (payload = {}, ack) => {
    const groupDmId = Number(payload?.groupDmId);
    if (!Number.isFinite(groupDmId) || groupDmId <= 0) {
      return ackOrEmitError(socket, ack, "INVALID_GROUP_DM", "groupDmId is required");
    }
    socket.leave(discussionGroupDmRoom(groupDmId));
    socket.data.discussionGroupDmRooms.delete(groupDmId);
    if (Number(socket.data.activeDiscussionGroupDmId) === groupDmId) {
      socket.data.activeDiscussionGroupDmId = null;
    }
    forgetGroupDmRoom(socketUser.id, groupDmId);
    return ackSuccess(ack, { groupDmId });
  });
}
