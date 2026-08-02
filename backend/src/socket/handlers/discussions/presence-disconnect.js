import { prisma } from "../../../db/prisma.js";
import { resolveServerRow, resolveChannelRow } from "../../../controllers/discussions/serverShared.js";
import { isDoNotDisturbStatus } from "../../../services/discussions/discussionPresence.js";

async function publicIdsForGroupIds(groupIds) {
  const ids = Array.from(groupIds);
  if (ids.length === 0) return new Map();
  const rows = await prisma.discussionGroup.findMany({
    where: { id: { in: ids } },
    select: { id: true, publicId: true },
  });
  return new Map(rows.map((r) => [r.id, r.publicId]));
}

export function registerPresenceDisconnectHandlers(socket, ctx) {
  const {
    socketUser, fanout, ackOrEmitError, ackSuccess,
    discussionChannelRoom, discussionRoom,
    touchDiscussionSession, closeDiscussionSession,
    pulseDiscussionPresenceHeartbeat,
  } = ctx;

      socket.on("presence:ping", async (payload = {}, ack) => {
        try {
          await pulseDiscussionPresenceHeartbeat(socket);
          if (payload?.activeGroupId != null) {
            const row = await resolveServerRow(payload.activeGroupId);
            if (row) socket.data.activeDiscussionGroupId = row.id;
          }
          if (payload?.activeChannelId != null) {
            const row = await resolveChannelRow(payload.activeChannelId);
            if (row) socket.data.activeDiscussionChannelId = row.id;
          }
          const now = new Date().toISOString();
          const statusRow = await prisma.user.findUnique({
            where: { id: Number(socketUser.id) },
            select: { discussionCustomStatus: true },
          });
          const presenceState = isDoNotDisturbStatus(statusRow?.discussionCustomStatus ?? "")
            ? "dnd"
            : "online";
          const rooms = socket.data.discussionRooms ?? new Set();
          const publicIdByGroupId = await publicIdsForGroupIds(rooms);
          for (const groupId of rooms) {
            fanout.emitToRoom(discussionRoom(groupId), "presence:update", {
              groupId: publicIdByGroupId.get(Number(groupId)) ?? null,
              userId: Number(socketUser.id),
              state: presenceState,
              lastSeenAt: now,
            });
          }
          return ackSuccess(ack, { lastSeenAt: now, activeGroupId: payload?.activeGroupId ?? null });
        } catch (error) {
          console.error("presence:ping failed:", error);
          return ackOrEmitError(socket, ack, "INTERNAL", "Failed to update presence");
        }
      });

      socket.on("disconnect", () => {
        console.log(
          `Socket disconnected: id=${socket.id} userId=${socketUser.id} role=${socketUser.role}`
        );
        closeDiscussionSession(socket).catch((error) => {
          console.error("Failed to close discussion session:", error);
        });
        const rooms = socket.data.discussionRooms ?? new Set();
        const channelRooms = socket.data.discussionChannelRooms ?? new Set();
        const now = new Date().toISOString();
        publicIdsForGroupIds(rooms).then((publicIdByGroupId) => {
          for (const groupId of rooms) {
            fanout.emitToRoom(discussionRoom(groupId), "presence:update", {
              groupId: publicIdByGroupId.get(Number(groupId)) ?? null,
              userId: Number(socketUser.id),
              state: "offline",
              lastSeenAt: now,
            });
          }
        }).catch((error) => {
          console.error("Failed to resolve presence group publicIds on disconnect:", error);
        });
        for (const cid of channelRooms) {
          socket.leave(discussionChannelRoom(cid));
        }
        socket.data.discussionChannelRooms?.clear();
      });
}
