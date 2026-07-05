import { prisma } from "../../db/prisma.js";
import {
  fetchOfferingWithScope,
  courseOfferingRoomName,
} from "../../utils/courseOfferingAccess.js";

/**
 * Course-chat realtime handlers (presence, typing, messaging), extracted from
 * server.js to keep the realtime layer modular.
 *
 * Presence/typing state is per-process and lives in this factory's closure:
 *   chatPresence: roomKey -> Map<userId, { full_name, sockets: Set<socketId> }>
 *   chatTyping  : roomKey -> Map<userId, { full_name, expiresAt }>
 *
 * Room keys use the offering public UUID (`course_<uuid>`), not the numeric PK.
 *
 * Usage in server.js:
 *   const chatHandlers = createChatHandlers(io);
 *   io.on("connection", (socket) => { ...; chatHandlers.register(socket); });
 *
 * @param {import("socket.io").Server} io
 */
export function createChatHandlers(io) {
  const chatPresence = new Map();
  const chatTyping = new Map();

  function broadcastChatPresence(roomKey) {
    const room = chatPresence.get(roomKey);
    const list = room
      ? Array.from(room.entries()).map(([userId, info]) => ({ userId, full_name: info.full_name }))
      : [];
    const publicId = roomKey?.startsWith("course_") ? roomKey.slice("course_".length) : roomKey;
    io.to(roomKey).emit("chat:presence", { courseOfferingId: publicId, users: list });
  }

  function broadcastChatTyping(roomKey) {
    const now = Date.now();
    const room = chatTyping.get(roomKey);
    if (room) {
      for (const [uid, info] of room) if (info.expiresAt <= now) room.delete(uid);
    }
    const list = room
      ? Array.from(room.entries()).map(([userId, info]) => ({ userId, full_name: info.full_name }))
      : [];
    const publicId = roomKey?.startsWith("course_") ? roomKey.slice("course_".length) : roomKey;
    io.to(roomKey).emit("chat:typing", { courseOfferingId: publicId, users: list });
  }

  function joinChatPresence(roomKey, userId, fullName, socketId) {
    if (!roomKey || !userId) return;
    let room = chatPresence.get(roomKey);
    if (!room) {
      room = new Map();
      chatPresence.set(roomKey, room);
    }
    let entry = room.get(userId);
    if (!entry) {
      entry = { full_name: fullName, sockets: new Set() };
      room.set(userId, entry);
    }
    entry.sockets.add(socketId);
    broadcastChatPresence(roomKey);
  }

  function leaveChatPresence(roomKey, userId, socketId) {
    if (!roomKey || !userId) return;
    const room = chatPresence.get(roomKey);
    if (!room) return;
    const entry = room.get(userId);
    if (!entry) return;
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) {
      room.delete(userId);
      const tRoom = chatTyping.get(roomKey);
      if (tRoom) tRoom.delete(userId);
    }
    if (room.size === 0) chatPresence.delete(roomKey);
    broadcastChatPresence(roomKey);
    broadcastChatTyping(roomKey);
  }

  /** Attach the per-socket course-chat event handlers. */
  function register(socket) {
    socket.data.courseRooms = socket.data.courseRooms || new Set();

    socket.on("join_room", async (courseOfferingId) => {
      const user = socket.data.user;
      if (!user?.id || !courseOfferingId) return;

      try {
        const { canSocketUserReadOffering } = await import("../../utils/courseOfferingAccess.js");
        const offering = await fetchOfferingWithScope(courseOfferingId);
        if (!offering || !canSocketUserReadOffering(user, offering)) return;

        const roomKey = courseOfferingRoomName(offering);
        if (!roomKey) return;

        socket.join(roomKey);
        socket.data.courseRooms.add(roomKey);
        joinChatPresence(roomKey, Number(user.id), user.full_name || `User ${user.id}`, socket.id);
      } catch (error) {
        console.error("join_room access check failed:", error);
      }
    });

    socket.on("leave_room", (courseOfferingId) => {
      if (!courseOfferingId) return;
      const roomKey = courseOfferingRoomName(String(courseOfferingId));
      if (!roomKey) return;
      socket.leave(roomKey);
      socket.data.courseRooms.delete(roomKey);
      if (socket.data.user?.id) leaveChatPresence(roomKey, Number(socket.data.user.id), socket.id);
    });

    socket.on("chat:typing", (payload = {}) => {
      const roomKey = courseOfferingRoomName(String(payload.courseOfferingId ?? ""));
      const user = socket.data.user;
      if (!roomKey || !user?.id) return;
      if (!socket.data.courseRooms?.has(roomKey)) return;
      let room = chatTyping.get(roomKey);
      if (!room) {
        room = new Map();
        chatTyping.set(roomKey, room);
      }
      const stopping = payload.state === "stop";
      if (stopping) {
        room.delete(Number(user.id));
      } else {
        room.set(Number(user.id), {
          full_name: user.full_name || `User ${user.id}`,
          expiresAt: Date.now() + 4000,
        });
      }
      broadcastChatTyping(roomKey);
    });

    socket.on("send_message", async (data) => {
      const { courseOfferingId, content, replyToId } = data;
      const senderId = Number(socket.data.user?.id);
      const trimmedContent = String(content ?? "").trim();
      if (!trimmedContent || !courseOfferingId || !Number.isFinite(senderId)) return;

      try {
        const { canSocketUserReadOffering } = await import("../../utils/courseOfferingAccess.js");
        const offering = await fetchOfferingWithScope(courseOfferingId);
        if (!offering || !canSocketUserReadOffering(socket.data.user, offering)) return;

        const internalId = offering.id;
        const roomKey = courseOfferingRoomName(offering);
        if (!roomKey) return;

        let room = await prisma.chatRoom.findFirst({
          where: { courseOfferingId: internalId },
        });
        if (!room) {
          room = await prisma.chatRoom.create({
            data: { name: "Course Chat", courseOfferingId: internalId },
          });
        }

        let safeReplyToId = null;
        if (replyToId != null) {
          const target = await prisma.chatMessage.findUnique({
            where: { id: Number(replyToId) },
            select: { roomId: true },
          });
          if (target?.roomId === room.id) safeReplyToId = Number(replyToId);
        }

        let mentionUserIds = [];
        const matches = Array.from(trimmedContent.matchAll(/@([a-z0-9][\w.\-]{0,40})/gi)).map((m) =>
          m[1].toLowerCase()
        );
        if (matches.length > 0) {
          const scoped = await prisma.courseOffering.findUnique({
            where: { id: internalId },
            include: {
              section: {
                include: {
                  studentRegistrations: {
                    include: { student: { select: { id: true, full_name: true } } },
                  },
                },
              },
              teacher: { select: { id: true, full_name: true } },
            },
          });
          const candidates = [
            ...((scoped?.section?.studentRegistrations ?? []).map((r) => r.student)),
            ...(scoped?.teacher ? [scoped.teacher] : []),
          ];
          const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
          const found = new Set();
          for (const token of matches) {
            const hit = candidates.find((u) => slug(u.full_name) === token);
            if (hit && hit.id !== Number(senderId)) found.add(hit.id);
          }
          mentionUserIds = Array.from(found);
        }

        const message = await prisma.chatMessage.create({
          data: {
            roomId: room.id,
            senderId: parseInt(senderId, 10),
            content: trimmedContent,
            replyToId: safeReplyToId,
            mentions: mentionUserIds.length
              ? { create: mentionUserIds.map((userId) => ({ userId })) }
              : undefined,
          },
          include: {
            sender: { select: { id: true, full_name: true } },
            replyTo: {
              select: {
                id: true,
                content: true,
                senderId: true,
                sender: { select: { id: true, full_name: true } },
              },
            },
            attachments: true,
            mentions: { select: { userId: true } },
          },
        });

        const tRoom = chatTyping.get(roomKey);
        if (tRoom) {
          tRoom.delete(Number(senderId));
          broadcastChatTyping(roomKey);
        }

        io.to(roomKey).emit("new_message", message);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    socket.on("disconnect", () => {
      if (!socket.data.user?.id) return;
      const userId = Number(socket.data.user.id);
      for (const roomKey of socket.data.courseRooms || []) {
        leaveChatPresence(roomKey, userId, socket.id);
      }
    });
  }

  return { register };
}
