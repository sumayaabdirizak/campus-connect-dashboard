export function registerPresenceDisconnectHandlers(socket, ctx) {
  const {
    socketUser, fanout, ackOrEmitError, ackSuccess,
    discussionChannelRoom, discussionRoom,
    touchDiscussionSession, closeDiscussionSession,
  } = ctx;

      socket.on("presence:ping", async (payload = {}, ack) => {
        try {
          await pulseDiscussionPresenceHeartbeat(socket);
          if (Number.isFinite(Number(payload?.activeGroupId))) {
            socket.data.activeDiscussionGroupId = Number(payload.activeGroupId);
          }
          if (Number.isFinite(Number(payload?.activeChannelId))) {
            socket.data.activeDiscussionChannelId = Number(payload.activeChannelId);
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
          for (const groupId of rooms) {
            fanout.emitToRoom(discussionRoom(groupId), "presence:update", {
              groupId: Number(groupId),
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
        for (const groupId of rooms) {
          fanout.emitToRoom(discussionRoom(groupId), "presence:update", {
            groupId: Number(groupId),
            userId: Number(socketUser.id),
            state: "offline",
            lastSeenAt: now,
          });
        }
        for (const cid of channelRooms) {
          socket.leave(discussionChannelRoom(cid));
        }
        socket.data.discussionChannelRooms?.clear();
      });
}
