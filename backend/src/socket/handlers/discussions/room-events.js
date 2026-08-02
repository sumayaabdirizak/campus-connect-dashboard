import { prisma } from "../../../db/prisma.js";
import { buildUnreadSocketPayload } from "../../../services/discussions/buildUnreadPayload.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "../../../services/discussions/permissions.js";
import { assertOfficeThreadSocketAccess } from "../../../services/offices/assertOfficeThreadSocketAccess.js";
import { getActiveMember, resolveGroupDmRow } from "../../../controllers/discussions/groupDms/helpers.js";
import { resolveServerRow, resolveChannelRow } from "../../../controllers/discussions/serverShared.js";

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
    discussionOfficeThreadRoom,
  } = ctx;

  socket.on("join:group", async (payload = {}, ack) => {
    try {
      const groupRow = await resolveServerRow(payload?.groupId);
      if (!groupRow) {
        return ackOrEmitError(socket, ack, "INVALID_GROUP", "groupId is required");
      }
      const groupId = groupRow.id;
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
        groupId: groupRow.publicId,
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

  socket.on("leave:group", async (payload = {}, ack) => {
    const groupRow = await resolveServerRow(payload?.groupId);
    if (!groupRow) {
      return ackOrEmitError(socket, ack, "INVALID_GROUP", "groupId is required");
    }
    const groupId = groupRow.id;
    socket.leave(discussionRoom(groupId));
    socket.data.discussionRooms.delete(groupId);
    if (Number(socket.data.activeDiscussionGroupId) === groupId) {
      socket.data.activeDiscussionGroupId = null;
    }
    forgetDiscussionRoom(socketUser.id, groupId);
    return ackSuccess(ack, { groupId: groupRow.publicId });
  });

  socket.on("channel:join", async (payload = {}, ack) => {
    try {
      const channelRow = await resolveChannelRow(payload?.channelId);
      if (!channelRow) {
        return ackOrEmitError(socket, ack, "INVALID_CHANNEL", "channelId is required");
      }
      const channelId = channelRow.id;
      const perms = await computeChannelPermissions({ userId: socketUser.id, channelId });
      if (!hasPermission(perms, PERMISSION_BITS.VIEW_CHANNEL)) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "Cannot view this channel");
      }
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { id: true, serverId: true, server: { select: { publicId: true } } },
      });
      if (!channel) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
      socket.join(discussionChannelRoom(channelId));
      socket.data.discussionChannelRooms.add(channelId);
      socket.data.activeDiscussionChannelId = channelId;
      socket.data.activeDiscussionGroupId = channel.serverId;
      socket.data.activeDiscussionGroupDmId = null;
      await touchDiscussionSession(socket);
      return ackSuccess(ack, { channelId: channelRow.publicId, serverId: channel.server.publicId });
    } catch (error) {
      console.error("channel:join failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to join channel");
    }
  });

  socket.on("channel:leave", async (payload = {}, ack) => {
    const channelRow = await resolveChannelRow(payload?.channelId);
    if (!channelRow) {
      return ackOrEmitError(socket, ack, "INVALID_CHANNEL", "channelId is required");
    }
    const channelId = channelRow.id;
    socket.leave(discussionChannelRoom(channelId));
    socket.data.discussionChannelRooms.delete(channelId);
    if (Number(socket.data.activeDiscussionChannelId) === channelId) {
      socket.data.activeDiscussionChannelId = null;
    }
    return ackSuccess(ack, { channelId: channelRow.publicId });
  });

  socket.on("groupdm:join", async (payload = {}, ack) => {
    try {
      // `payload.groupDmId` is the client-facing UUID (or, for old clients,
      // a legacy numeric id) — getActiveMember resolves either to the row.
      const member = await getActiveMember(payload?.groupDmId, Number(socketUser.id));
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "Not a member of this group DM");
      }
      const groupDmId = member.groupDm.id;
      socket.join(discussionGroupDmRoom(groupDmId));
      socket.data.discussionGroupDmRooms.add(groupDmId);
      socket.data.activeDiscussionGroupDmId = groupDmId;
      socket.data.activeDiscussionChannelId = null;
      rememberGroupDmRoom(socketUser.id, groupDmId);
      await touchDiscussionSession(socket);
      return ackSuccess(ack, {
        groupDmId: member.groupDm.publicId,
        myRole: member.role,
        canPost: member.canPost,
      });
    } catch (error) {
      console.error("groupdm:join failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to join group DM");
    }
  });

  socket.on("groupdm:leave", async (payload = {}, ack) => {
    const row = await resolveGroupDmRow(payload?.groupDmId);
    if (!row) {
      return ackOrEmitError(socket, ack, "INVALID_GROUP_DM", "groupDmId is required");
    }
    const groupDmId = row.id;
    socket.leave(discussionGroupDmRoom(groupDmId));
    socket.data.discussionGroupDmRooms.delete(groupDmId);
    if (Number(socket.data.activeDiscussionGroupDmId) === groupDmId) {
      socket.data.activeDiscussionGroupDmId = null;
    }
    forgetGroupDmRoom(socketUser.id, groupDmId);
    return ackSuccess(ack, { groupDmId: row.publicId });
  });

  socket.on("officeThread:join", async (payload = {}, ack) => {
    try {
      const officeThreadId = Number(payload?.officeThreadId);
      if (!Number.isFinite(officeThreadId) || officeThreadId <= 0) {
        return ackOrEmitError(socket, ack, "INVALID_THREAD", "officeThreadId is required");
      }
      const thread = await assertOfficeThreadSocketAccess(
        socketUser.id,
        socketUser.role,
        officeThreadId
      );
      if (!thread) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "Cannot access this office chat");
      }
      const room = discussionOfficeThreadRoom(officeThreadId);
      socket.join(room);
      socket.data.discussionOfficeThreadRooms.add(officeThreadId);
      socket.data.activeOfficeThreadId = officeThreadId;
      await touchDiscussionSession(socket);
      return ackSuccess(ack, { officeThreadId });
    } catch (error) {
      console.error("officeThread:join failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to join office chat");
    }
  });

  socket.on("officeThread:leave", (payload = {}, ack) => {
    const officeThreadId = Number(payload?.officeThreadId);
    if (!Number.isFinite(officeThreadId) || officeThreadId <= 0) {
      return ackOrEmitError(socket, ack, "INVALID_THREAD", "officeThreadId is required");
    }
    socket.leave(discussionOfficeThreadRoom(officeThreadId));
    socket.data.discussionOfficeThreadRooms?.delete(officeThreadId);
    if (Number(socket.data.activeOfficeThreadId) === officeThreadId) {
      socket.data.activeOfficeThreadId = null;
    }
    return ackSuccess(ack, { officeThreadId });
  });
}
