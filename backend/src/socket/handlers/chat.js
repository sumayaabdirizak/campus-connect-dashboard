import { prisma } from "../../db/prisma.js";

/**
 * Course-chat realtime handlers (presence, typing, messaging), extracted from
 * server.js to keep the realtime layer modular.
 *
 * Presence/typing state is per-process and lives in this factory's closure:
 *   chatPresence: courseOfferingId -> Map<userId, { full_name, sockets: Set<socketId> }>
 *   chatTyping  : courseOfferingId -> Map<userId, { full_name, expiresAt }>
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

  function broadcastChatPresence(courseOfferingId) {
    const room = chatPresence.get(courseOfferingId);
    const list = room
      ? Array.from(room.entries()).map(([userId, info]) => ({ userId, full_name: info.full_name }))
      : [];
    io.to(`course_${courseOfferingId}`).emit('chat:presence', { courseOfferingId, users: list });
  }

  function broadcastChatTyping(courseOfferingId) {
    const now = Date.now();
    const room = chatTyping.get(courseOfferingId);
    if (room) {
      for (const [uid, info] of room) if (info.expiresAt <= now) room.delete(uid);
    }
    const list = room
      ? Array.from(room.entries()).map(([userId, info]) => ({ userId, full_name: info.full_name }))
      : [];
    io.to(`course_${courseOfferingId}`).emit('chat:typing', { courseOfferingId, users: list });
  }

  function joinChatPresence(courseOfferingId, userId, fullName, socketId) {
    if (!courseOfferingId || !userId) return;
    let room = chatPresence.get(courseOfferingId);
    if (!room) {
      room = new Map();
      chatPresence.set(courseOfferingId, room);
    }
    let entry = room.get(userId);
    if (!entry) {
      entry = { full_name: fullName, sockets: new Set() };
      room.set(userId, entry);
    }
    entry.sockets.add(socketId);
    broadcastChatPresence(courseOfferingId);
  }

  function leaveChatPresence(courseOfferingId, userId, socketId) {
    if (!courseOfferingId || !userId) return;
    const room = chatPresence.get(courseOfferingId);
    if (!room) return;
    const entry = room.get(userId);
    if (!entry) return;
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) {
      room.delete(userId);
      const tRoom = chatTyping.get(courseOfferingId);
      if (tRoom) tRoom.delete(userId);
    }
    if (room.size === 0) chatPresence.delete(courseOfferingId);
    broadcastChatPresence(courseOfferingId);
    broadcastChatTyping(courseOfferingId);
  }

  /** Attach the per-socket course-chat event handlers. */
  function register(socket) {
    // Track course-room presence on socket.data so disconnect can clean up.
    socket.data.courseRooms = socket.data.courseRooms || new Set();

    socket.on("join_room", async (courseOfferingId) => {
      const cid = Number(courseOfferingId);
      if (!Number.isFinite(cid)) return;
      const user = socket.data.user;
      if (!user?.id) return;

      // Gate room join on course-offering read access — without this any
      // authenticated user could join `course_${cid}` for an offering they
      // aren't enrolled in / don't teach and read its live chat stream.
      try {
        const { fetchOfferingWithScope, canSocketUserReadOffering } = await import(
          "../../utils/courseOfferingAccess.js"
        );
        const offering = await fetchOfferingWithScope(cid);
        if (!offering || !canSocketUserReadOffering(user, offering)) return;
      } catch (error) {
        console.error("join_room access check failed:", error);
        return;
      }

      socket.join(`course_${cid}`);
      socket.data.courseRooms.add(cid);
      joinChatPresence(cid, Number(user.id), user.full_name || `User ${user.id}`, socket.id);
    });

    socket.on("leave_room", (courseOfferingId) => {
      const cid = Number(courseOfferingId);
      if (!Number.isFinite(cid)) return;
      socket.leave(`course_${cid}`);
      socket.data.courseRooms.delete(cid);
      if (socket.data.user?.id) leaveChatPresence(cid, Number(socket.data.user.id), socket.id);
    });

    // Typing — client sends start; server auto-expires the slot after 4s so a
    // dropped stop event doesn't leave the indicator stuck.
    socket.on("chat:typing", (payload = {}) => {
      const cid = Number(payload.courseOfferingId);
      const user = socket.data.user;
      if (!Number.isFinite(cid) || !user?.id) return;
      let room = chatTyping.get(cid);
      if (!room) {
        room = new Map();
        chatTyping.set(cid, room);
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
      broadcastChatTyping(cid);
    });

    socket.on("send_message", async (data) => {
      const { courseOfferingId, content, replyToId } = data;
      // Sender is the authenticated socket user — never the client-supplied
      // `senderId`, which could be forged to impersonate anyone.
      const senderId = Number(socket.data.user?.id);
      if (!content || !courseOfferingId || !Number.isFinite(senderId)) return;

      try {
        // Gate on read access so a user can't post into an offering they aren't
        // enrolled in / don't teach.
        const { fetchOfferingWithScope, canSocketUserReadOffering } = await import(
          "../../utils/courseOfferingAccess.js"
        );
        const offering = await fetchOfferingWithScope(parseInt(courseOfferingId));
        if (!offering || !canSocketUserReadOffering(socket.data.user, offering)) return;

        let room = await prisma.chatRoom.findFirst({
          where: { courseOfferingId: parseInt(courseOfferingId) },
        });
        if (!room) {
          room = await prisma.chatRoom.create({
            data: { name: "Course Chat", courseOfferingId: parseInt(courseOfferingId) },
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

        // Resolve @mentions inline so socket-sent messages also notify members.
        let mentionUserIds = [];
        const matches = Array.from(String(content).matchAll(/@([a-z0-9][\w.\-]{0,40})/gi)).map((m) =>
          m[1].toLowerCase()
        );
        if (matches.length > 0) {
          const offering = await prisma.courseOffering.findUnique({
            where: { id: parseInt(courseOfferingId) },
            include: {
              section: { include: { studentRegistrations: { include: { student: { select: { id: true, full_name: true } } } } } },
              teacher: { select: { id: true, full_name: true } },
            },
          });
          const candidates = [
            ...((offering?.section?.studentRegistrations ?? []).map((r) => r.student)),
            ...(offering?.teacher ? [offering.teacher] : []),
          ];
          const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
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
            senderId: parseInt(senderId),
            content: String(content).trim(),
            replyToId: safeReplyToId,
            mentions: mentionUserIds.length
              ? { create: mentionUserIds.map((userId) => ({ userId })) }
              : undefined,
          },
          include: {
            sender: { select: { id: true, full_name: true } },
            replyTo: { select: { id: true, content: true, senderId: true, sender: { select: { id: true, full_name: true } } } },
            attachments: true,
            mentions: { select: { userId: true } },
          },
        });

        // Clear the sender's typing slot now that the message landed.
        const tRoom = chatTyping.get(Number(courseOfferingId));
        if (tRoom) {
          tRoom.delete(Number(senderId));
          broadcastChatTyping(Number(courseOfferingId));
        }

        io.to(`course_${courseOfferingId}`).emit("new_message", message);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    socket.on("disconnect", () => {
      if (!socket.data.user?.id) return;
      const userId = Number(socket.data.user.id);
      for (const cid of socket.data.courseRooms || []) {
        leaveChatPresence(cid, userId, socket.id);
      }
    });
  }

  return { register };
}
