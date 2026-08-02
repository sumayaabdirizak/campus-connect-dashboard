import { prisma } from "../../db/prisma.js";
import { isDoNotDisturbStatus } from "../../services/discussions/discussionPresence.js";
import { registerMessageSendHandler } from "./discussions/message-send.js";
import { registerTypingHandlers } from "./discussions/typing-events.js";
import { registerReadReceiptHandlers } from "./discussions/read-receipts.js";
import { registerPresenceDisconnectHandlers } from "./discussions/presence-disconnect.js";
import { registerRoomEventHandlers } from "./discussions/room-events.js";
import {
  ackOrEmitError,
  ackSuccess,
  createDiscussionRoomHelpers,
} from "./discussions/rooms.js";
import { createDiscussionSessionHelpers } from "./discussions/session.js";

/**
 * Discussion realtime handlers — presence, typing, messaging, channels, group DMs.
 *
 * @param {import("socket.io").Server} io
 * @param {{ fanout: ReturnType<import("../../services/discussions/reliability/fanout.js").createFanout>, presenceStorePromise: Promise<unknown> }} deps
 */
export function createDiscussionHandlers(io, { fanout, presenceStorePromise }) {
  const rooms = createDiscussionRoomHelpers(io);
  const sessions = createDiscussionSessionHelpers({ fanout, presenceStorePromise });

  function handleConnection(client) {
    const user = client.data.user;
    client.join("global");
    client.join(`user:${Number(user.id)}`);
    client.data.discussionRooms = new Set();
    client.data.discussionChannelRooms = new Set();
    client.data.discussionGroupDmRooms = new Set();
    client.data.discussionOfficeThreadRooms = new Set();
    client.data.activeDiscussionGroupId = null;
    client.data.activeDiscussionChannelId = null;
    client.data.activeDiscussionGroupDmId = null;
    client.data.activeOfficeThreadId = null;

    const joinRoom = (prefix, value) => {
      if (value === undefined || value === null || !Number.isFinite(Number(value))) return;
      client.join(`${prefix}:${Number(value)}`);
    };

    for (const facultyId of user.facultyIds ?? []) joinRoom("faculty", facultyId);
    for (const departmentId of user.departmentIds ?? []) joinRoom("department", departmentId);
    for (const batchId of user.batchIds ?? []) joinRoom("batch", batchId);
    for (const sectionId of user.sectionIds ?? []) joinRoom("section", sectionId);

    for (const rememberedGroupId of rooms.getRememberedDiscussionRooms(user.id)) {
      client.join(rooms.discussionRoom(rememberedGroupId));
      client.data.discussionRooms.add(Number(rememberedGroupId));
    }
    for (const rememberedGdm of rooms.getRememberedGroupDmRooms(user.id)) {
      client.join(rooms.discussionGroupDmRoom(rememberedGdm));
      client.data.discussionGroupDmRooms.add(Number(rememberedGdm));
    }
  }

  function beginSession(socket) {
    const socketUser = socket.data.user;
    handleConnection(socket);
    sessions.registerDiscussionSession(socket).catch((error) => {
      console.error("Failed to register discussion session:", error);
    });
    sessions.emitPendingNotificationsToSocket(socket).catch((error) => {
      console.error("Failed to emit pending notifications:", error);
    });

    console.log(
      `Socket connected: id=${socket.id} userId=${socketUser.id} role=${socketUser.role}`
    );

    prisma.user
      .findUnique({
        where: { id: Number(socketUser.id) },
        select: { discussionCustomStatus: true },
      })
      .then((row) => {
        socket.emit("presence:update", {
          userId: socketUser.id,
          state: isDoNotDisturbStatus(row?.discussionCustomStatus ?? "") ? "dnd" : "online",
          lastSeenAt: new Date().toISOString(),
        });
      })
      .catch(() => {
        socket.emit("presence:update", {
          userId: socketUser.id,
          state: "online",
          lastSeenAt: new Date().toISOString(),
        });
      });
  }

  function registerEventHandlers(socket) {
    const socketUser = socket.data.user;
    const ctx = {
      io,
      socketUser,
      fanout,
      ackOrEmitError,
      ackSuccess,
      ...rooms,
      ...sessions,
    };

    registerRoomEventHandlers(socket, ctx);
    registerMessageSendHandler(socket, ctx);
    registerTypingHandlers(socket, ctx);
    registerReadReceiptHandlers(socket, ctx);
    registerPresenceDisconnectHandlers(socket, ctx);
  }

  return { beginSession, registerEventHandlers };
}
