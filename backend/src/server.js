import { app } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { assertEnv, env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import jwt from "jsonwebtoken";
import { setIo } from "./socket/hub.js";
import { loadUserAnnouncementScope } from "./utils/userAnnouncementScope.js";
import { createPresenceStore } from "./features/discussions/reliability/presenceStore.js";
import { createFanout } from "./features/discussions/reliability/fanout.js";
import { metricCount, metricTimerEnd, metricTimerStart } from "./features/discussions/reliability/metrics.js";
import { startAnnouncementBullWorkers } from "./workers/announcementBullmq.js";
import { isAnnouncementSchedulerEnabled } from "./features/announcements/services/announcementJobs.service.js";
import { runAnnouncementExpiryFallbackScan } from "./features/announcements/services/announcementExpiry.service.js";
import { runAnnouncementPublishFallbackScan } from "./features/announcements/services/announcementPublishFallback.service.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "./features/discussions/permissions.js";
import { buildUnreadSocketPayload } from "./features/discussions/buildUnreadPayload.js";
import { runDiscussionMembershipNightlySync } from "./features/discussions/membershipSync.service.js";
import { autoSubmitExpiredAttempts } from "./services/quizAttempt.service.js";
import { extractMentionHandles, resolveMentionUserIds } from "./features/discussions/mentionResolution.js";
import {
  excludeDoNotDisturbUserIds,
  getDiscussionPresenceWindowMs,
  isDoNotDisturbStatus,
} from "./features/discussions/discussionPresence.js";
import {
  collectThreadParticipantSenderIds,
  resolveThreadRootMessageId,
} from "./features/discussions/threadParticipants.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
  deriveQuestionFields,
} from "./features/discussions/discussionMessagePublic.js";

assertEnv();

const port = Number(env.PORT);
const socketAllowedOrigins = (
  process.env.SOCKET_CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (socketAllowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});
setIo(io);
const fanout = createFanout(io);

// Course-chat presence + typing — module-scoped because the connection
// handler runs per-socket.
//   chatPresence: courseOfferingId -> Map<userId, { full_name, sockets: Set<socketId> }>
//   chatTyping  : courseOfferingId -> Map<userId, { full_name, expiresAt }>
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

const presenceStorePromise = createPresenceStore();

async function initializeSocketAdapter() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;
  try {
    const [{ createClient }, { createAdapter }] = await Promise.all([
      import("redis"),
      import("@socket.io/redis-adapter"),
    ]);
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    pubClient.on("error", (err) => console.error("Redis pub client error:", err?.message || err));
    subClient.on("error", (err) => console.error("Redis sub client error:", err?.message || err));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.IO Redis adapter enabled");
  } catch (error) {
    console.warn("Socket.IO Redis adapter not enabled:", error?.message || error);
  }
}

const DISCUSSION_ROOM_PREFIX = "discussion:group:";
const DISCUSSION_CHANNEL_ROOM_PREFIX = "channel:";
const DISCUSSION_GROUP_DM_ROOM_PREFIX = "groupdm:";
const DISCUSSION_SERVER_ID = process.env.SERVER_ID || process.env.HOSTNAME || "api";
const userDiscussionRooms = new Map();
const userGroupDmRooms = new Map();

function discussionRoom(groupId) {
  return `${DISCUSSION_ROOM_PREFIX}${Number(groupId)}`;
}

function discussionChannelRoom(channelId) {
  return `${DISCUSSION_CHANNEL_ROOM_PREFIX}${Number(channelId)}`;
}

function discussionGroupDmRoom(groupDmId) {
  return `${DISCUSSION_GROUP_DM_ROOM_PREFIX}${Number(groupDmId)}`;
}

function rememberDiscussionRoom(userId, groupId) {
  const key = Number(userId);
  const set = userDiscussionRooms.get(key) ?? new Set();
  set.add(Number(groupId));
  userDiscussionRooms.set(key, set);
}

function forgetDiscussionRoom(userId, groupId) {
  const key = Number(userId);
  const set = userDiscussionRooms.get(key);
  if (!set) return;
  set.delete(Number(groupId));
  if (set.size === 0) userDiscussionRooms.delete(key);
}

function getRememberedDiscussionRooms(userId) {
  return Array.from(userDiscussionRooms.get(Number(userId)) ?? []);
}

function rememberGroupDmRoom(userId, groupDmId) {
  const key = Number(userId);
  const set = userGroupDmRooms.get(key) ?? new Set();
  set.add(Number(groupDmId));
  userGroupDmRooms.set(key, set);
}

function forgetGroupDmRoom(userId, groupDmId) {
  const key = Number(userId);
  const set = userGroupDmRooms.get(key);
  if (!set) return;
  set.delete(Number(groupDmId));
  if (set.size === 0) userGroupDmRooms.delete(key);
}

function getRememberedGroupDmRooms(userId) {
  return Array.from(userGroupDmRooms.get(Number(userId)) ?? []);
}

function getUserSockets(userId) {
  const sockets = [];
  for (const [, s] of io.sockets.sockets) {
    if (Number(s.data?.user?.id) === Number(userId)) sockets.push(s);
  }
  return sockets;
}

function isUserViewingGroup(userId, groupId) {
  const sockets = getUserSockets(userId);
  return sockets.some((s) => Number(s.data?.activeDiscussionGroupId) === Number(groupId));
}

function isUserViewingChannel(userId, channelId) {
  const sockets = getUserSockets(userId);
  return sockets.some((s) => Number(s.data?.activeDiscussionChannelId) === Number(channelId));
}

function isUserViewingGroupDm(userId, groupDmId) {
  const sockets = getUserSockets(userId);
  return sockets.some((s) => Number(s.data?.activeDiscussionGroupDmId) === Number(groupDmId));
}

async function emitUnreadUpdateToUsers(userIds) {
  const started = metricTimerStart();
  const ids = Array.from(new Set((userIds || []).map((id) => Number(id)).filter(Boolean)));
  if (ids.length === 0) return;
  for (const id of ids) {
    const payload = await buildUnreadSocketPayload(id);
    fanout.emitToUser(id, "unread:update", payload);
  }
  metricTimerEnd("notifications.unread_update.ms", started);
}

async function emitPendingNotificationsToSocket(socket) {
  const userId = Number(socket.data.user?.id);
  if (!Number.isFinite(userId)) return;
  const unread = await prisma.discussionNotification.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  if (unread.length > 0) {
    socket.emit("notifications:pending", unread);
    metricCount("notifications.pending_emitted", unread.length);
  }
  await emitUnreadUpdateToUsers([userId]);
}

async function registerDiscussionSession(socket) {
  const userId = Number(socket.data.user?.id);
  if (!Number.isFinite(userId)) return;
  const presenceStore = await presenceStorePromise;
  await presenceStore.upsertSession({
    socketId: socket.id,
    userId,
    serverId: DISCUSSION_SERVER_ID,
    connectedAt: new Date(),
    lastSeenAt: new Date(),
  });
  await prisma.discussionSession.upsert({
    where: { socketId: socket.id },
    create: {
      userId,
      socketId: socket.id,
      serverId: DISCUSSION_SERVER_ID,
      connectedAt: new Date(),
      lastSeenAt: new Date(),
      disconnectedAt: null,
    },
    update: {
      userId,
      serverId: DISCUSSION_SERVER_ID,
      connectedAt: new Date(),
      lastSeenAt: new Date(),
      disconnectedAt: null,
    },
  });
}

async function touchDiscussionSession(socket) {
  const presenceStore = await presenceStorePromise;
  await presenceStore.touchSession(socket.id);
  await prisma.discussionSession.updateMany({
    where: { socketId: socket.id },
    data: { lastSeenAt: new Date(), disconnectedAt: null },
  });
}

/** Heartbeat only (Redis): keeps socket alive for push routing; does not bump DB lastSeenAt (activity-based away). */
async function pulseDiscussionPresenceHeartbeat(socket) {
  const presenceStore = await presenceStorePromise;
  await presenceStore.touchSession(socket.id);
}

async function closeDiscussionSession(socket) {
  const presenceStore = await presenceStorePromise;
  await presenceStore.closeSession(socket.id);
  await prisma.discussionSession.updateMany({
    where: { socketId: socket.id },
    data: { disconnectedAt: new Date(), lastSeenAt: new Date() },
  });
}

/** Users with a live socket and activity within the online window (DB lastSeenAt — not heartbeat-only). */
async function getActiveDiscussionUserIdSet(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return new Set();
  const threshold = new Date(Date.now() - getDiscussionPresenceWindowMs().activeMs);
  const rows = await prisma.discussionSession.findMany({
    where: {
      userId: { in: userIds },
      disconnectedAt: null,
      lastSeenAt: { gte: threshold },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return new Set(rows.map((row) => Number(row.userId)));
}

async function getDiscussionMembership(groupId, userId) {
  return prisma.discussionGroupMembership.findFirst({
    where: {
      groupId: Number(groupId),
      userId: Number(userId),
      leftAt: null,
      isActive: true,
      group: { status: "ACTIVE" },
    },
    include: {
      group: {
        select: {
          id: true,
          status: true,
          e2eeEnabled: true,
          e2eeCurrentKeyVersion: true,
          e2eeRotationRequired: true,
        },
      },
    },
  });
}

function ackOrEmitError(socket, ack, code, message, extra = {}) {
  const payload = { ok: false, code, message, ...extra };
  if (typeof ack === "function") return ack(payload);
  socket.emit("ws:error", payload);
}

function ackSuccess(ack, payload = {}) {
  if (typeof ack === "function") ack({ ok: true, ...payload });
}

function readCookieFromHeader(cookieHeader, key) {
  if (!cookieHeader) return null;
  const chunks = cookieHeader.split(";").map((entry) => entry.trim());
  for (const chunk of chunks) {
    const [name, ...rest] = chunk.split("=");
    if (name === key) return decodeURIComponent(rest.join("="));
  }
  return null;
}

io.use(async (socket, next) => {
  try {
    const headerAuth = socket.handshake.headers.authorization || "";
    const bearerToken = headerAuth.startsWith("Bearer ") ? headerAuth.slice(7) : null;
    const authToken = socket.handshake.auth?.token || null;
    const cookieToken = readCookieFromHeader(socket.handshake.headers.cookie, "auth_token");
    const token = bearerToken || authToken || cookieToken;
    if (!token) return next(new Error("Unauthorized"));

    const payload = jwt.verify(token, env.JWT_SECRET);
    const scope = await loadUserAnnouncementScope(prisma, Number(payload.sub));
    if (!scope) return next(new Error("Unauthorized"));

    socket.data.user = {
      id: scope.userId,
      role: scope.role,
      facultyIds: scope.facultyIds,
      departmentIds: scope.departmentIds,
      batchIds: scope.batchIds,
      sectionIds: scope.sectionIds,
    };
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

function handleConnection(client) {
  const user = client.data.user;
  client.join("global");
  client.join(`user:${Number(user.id)}`);
  client.data.discussionRooms = new Set();
  client.data.discussionChannelRooms = new Set();
  client.data.discussionGroupDmRooms = new Set();
  client.data.activeDiscussionGroupId = null;
  client.data.activeDiscussionChannelId = null;
  client.data.activeDiscussionGroupDmId = null;

  const joinRoom = (prefix, value) => {
    if (value === undefined || value === null || !Number.isFinite(Number(value))) return;
    client.join(`${prefix}:${Number(value)}`);
  };

  for (const facultyId of user.facultyIds ?? []) joinRoom("faculty", facultyId);
  for (const departmentId of user.departmentIds ?? []) joinRoom("department", departmentId);
  for (const batchId of user.batchIds ?? []) joinRoom("batch", batchId);
  for (const sectionId of user.sectionIds ?? []) joinRoom("section", sectionId);

  for (const rememberedGroupId of getRememberedDiscussionRooms(user.id)) {
    const room = discussionRoom(rememberedGroupId);
    client.join(room);
    client.data.discussionRooms.add(Number(rememberedGroupId));
  }
  for (const rememberedGdm of getRememberedGroupDmRooms(user.id)) {
    const room = discussionGroupDmRoom(rememberedGdm);
    client.join(room);
    client.data.discussionGroupDmRooms.add(Number(rememberedGdm));
  }
}

async function ensureTypingDisplayName(socket, userId) {
  if (socket.data.typingDisplayName) return socket.data.typingDisplayName;
  const row = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { full_name: true },
  });
  const name = (row?.full_name || "").trim() || `User ${Number(userId)}`;
  socket.data.typingDisplayName = name;
  return name;
}

io.on("connection", (socket) => {
  const socketUser = socket.data.user;
  handleConnection(socket);
  registerDiscussionSession(socket).catch((error) => {
    console.error("Failed to register discussion session:", error);
  });
  emitPendingNotificationsToSocket(socket).catch((error) => {
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

  // Track course-room presence on socket.data so disconnect can clean up.
  socket.data.courseRooms = socket.data.courseRooms || new Set();

  socket.on("join_room", (courseOfferingId) => {
    const cid = Number(courseOfferingId);
    if (!Number.isFinite(cid)) return;
    socket.join(`course_${cid}`);
    socket.data.courseRooms.add(cid);
    const user = socket.data.user;
    if (user?.id) {
      joinChatPresence(cid, Number(user.id), user.full_name || `User ${user.id}`, socket.id);
    }
  });

  socket.on("leave_room", (courseOfferingId) => {
    const cid = Number(courseOfferingId);
    if (!Number.isFinite(cid)) return;
    socket.leave(`course_${cid}`);
    socket.data.courseRooms.delete(cid);
    if (socket.data.user?.id) leaveChatPresence(cid, Number(socket.data.user.id), socket.id);
  });

  // ── Quiz live monitor (teacher) ───────────────────────────────────────
  // Teachers subscribe to `quiz:${quizId}:monitor` to receive real-time
  // progress events as students take the quiz. We RBAC-check on join — only
  // a user with manage rights on the underlying course offering can listen.
  // Students cannot subscribe (would leak peers' answer progress).
  socket.on("quiz:monitor:join", async (quizId, ack) => {
    try {
      const qid = Number(quizId);
      if (!Number.isFinite(qid)) {
        if (typeof ack === "function") ack({ ok: false, error: "bad_quiz_id" });
        return;
      }
      const { fetchQuizWithOffering, canManageOfferingContent } = await import(
        "./utils/courseOfferingAccess.js"
      );
      const quiz = await fetchQuizWithOffering(qid);
      if (!quiz) {
        if (typeof ack === "function") ack({ ok: false, error: "not_found" });
        return;
      }
      const allowed = await canManageOfferingContent(socket.data.user, quiz.courseOffering);
      if (!allowed) {
        if (typeof ack === "function") ack({ ok: false, error: "forbidden" });
        return;
      }
      const room = `quiz:${qid}:monitor`;
      socket.join(room);
      socket.data.quizMonitorRooms = socket.data.quizMonitorRooms || new Set();
      socket.data.quizMonitorRooms.add(qid);
      if (typeof ack === "function") ack({ ok: true, room });
    } catch (e) {
      console.warn("[quiz-monitor] join failed:", e.message);
      if (typeof ack === "function") ack({ ok: false, error: "server_error" });
    }
  });

  socket.on("quiz:monitor:leave", (quizId) => {
    const qid = Number(quizId);
    if (!Number.isFinite(qid)) return;
    socket.leave(`quiz:${qid}:monitor`);
    socket.data.quizMonitorRooms?.delete(qid);
  });

  socket.on("disconnect", () => {
    if (!socket.data.user?.id) return;
    const userId = Number(socket.data.user.id);
    for (const cid of socket.data.courseRooms || []) {
      leaveChatPresence(cid, userId, socket.id);
    }
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
    const { courseOfferingId, content, senderId, replyToId } = data;
    if (!content || !courseOfferingId || !senderId) return;

    try {
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
          where: {
            userId: Number(socketUser.id),
            groupId,
            readAt: null,
          },
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
    const room = discussionRoom(groupId);
    socket.leave(room);
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
      const room = discussionChannelRoom(channelId);
      socket.join(room);
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
      const room = discussionGroupDmRoom(groupDmId);
      socket.join(room);
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

  socket.on("message:send", async (payload = {}, ack) => {
    try {
      const started = metricTimerStart();
      const channelId = Number(payload?.channelId);
      const attachmentIds = Array.isArray(payload?.attachmentIds)
        ? payload.attachmentIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];
      const e2e = payload?.e2e ?? null;
      const messageTypeUpper =
        typeof payload?.messageType === "string" ? payload.messageType.toUpperCase() : "TEXT";

      if (Number.isFinite(channelId) && channelId > 0) {
        const parentMessageIdRawCh = Number(payload?.parentMessageId);
        const parentMessageIdCh =
          Number.isInteger(parentMessageIdRawCh) && parentMessageIdRawCh > 0
            ? parentMessageIdRawCh
            : null;
        const rawContentCh = typeof payload?.content === "string" ? payload.content : "";

        const channel = await prisma.discussionChannel.findUnique({
          where: { id: channelId },
          select: {
            id: true,
            serverId: true,
            server: { select: { id: true, e2eeEnabled: true } },
          },
        });
        if (!channel) return ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found");
        const perms = await computeChannelPermissions({ userId: socketUser.id, channelId });
        if (!hasPermission(perms, PERMISSION_BITS.SEND_MESSAGES)) {
          return ackOrEmitError(socket, ack, "FORBIDDEN", "Cannot send in this channel");
        }
        const e2eeEnabled = channel.server?.e2eeEnabled !== false;
        if (e2eeEnabled) {
          if (
            !e2e ||
            typeof e2e.ciphertext !== "string" ||
            !e2e.ciphertext ||
            typeof e2e.nonce !== "string" ||
            !e2e.nonce ||
            !Number.isFinite(Number(e2e.keyVersion)) ||
            typeof e2e.senderDeviceId !== "string" ||
            !e2e.senderDeviceId
          ) {
            return ackOrEmitError(
              socket,
              ack,
              "E2E_REQUIRED",
              "ciphertext, nonce, keyVersion, senderDeviceId are required for E2E channels"
            );
          }
        }
        const serverId = channel.serverId;
        if (attachmentIds.length > 0) {
          const pendingAttachments = await prisma.discussionAttachment.findMany({
            where: {
              id: { in: attachmentIds },
              uploadedById: Number(socketUser.id),
              status: "PENDING",
              messageId: null,
              OR: [{ groupId: serverId }, { groupId: null }],
            },
            select: { id: true },
          });
          if (pendingAttachments.length !== attachmentIds.length) {
            return ackOrEmitError(
              socket,
              ack,
              "INVALID_ATTACHMENT",
              "Some attachments are invalid or unavailable"
            );
          }
        }
        if (parentMessageIdCh != null) {
          const parent = await prisma.discussionMessage.findFirst({
            where: {
              id: parentMessageIdCh,
              channelId,
              deletedAt: null,
              parentMessageId: null,
            },
            select: { id: true },
          });
          if (!parent) {
            return ackOrEmitError(
              socket,
              ack,
              "INVALID_PARENT",
              "parentMessageId must be a root message in this channel"
            );
          }
        }

        let effectiveContentCh = "";
        let hasTextCh = false;
        let createdMessageTypeCh = "TEXT";
        let isAnonymousFlagCh = false;
        if (e2eeEnabled) {
          effectiveContentCh = rawContentCh.trim();
          hasTextCh = effectiveContentCh.length > 0;
          createdMessageTypeCh =
            attachmentIds.length > 0 && !hasTextCh ? "MEDIA" : messageTypeUpper;
        } else {
          const derivedCh = deriveQuestionFields({
            content: rawContentCh,
            messageType: messageTypeUpper,
            postAsQuestion: Boolean(payload?.postAsQuestion),
            isAnonymous: Boolean(payload?.isAnonymous),
            parentMessageId: parentMessageIdCh,
          });
          effectiveContentCh = derivedCh.contentStored.trim();
          hasTextCh = effectiveContentCh.length > 0;
          createdMessageTypeCh =
            attachmentIds.length > 0 && !hasTextCh ? "MEDIA" : derivedCh.messageType;
          isAnonymousFlagCh = derivedCh.isAnonymous;
          if (createdMessageTypeCh !== "QUESTION") isAnonymousFlagCh = false;
          if (createdMessageTypeCh === "QUESTION" && !hasTextCh) {
            return ackOrEmitError(socket, ack, "INVALID_MESSAGE", "Question text is required");
          }
        }
        if (!hasTextCh && attachmentIds.length === 0) {
          return ackOrEmitError(socket, ack, "INVALID_MESSAGE", "content or attachmentIds required");
        }

        const result = await prisma.$transaction(async (tx) => {
          const created = await tx.discussionMessage.create({
            data: {
              groupId: serverId,
              channelId,
              senderId: Number(socketUser.id),
              content: e2eeEnabled ? null : hasTextCh ? effectiveContentCh : null,
              messageType: createdMessageTypeCh,
              isAnonymous: isAnonymousFlagCh,
              parentMessageId: parentMessageIdCh ?? undefined,
              ciphertext: e2e?.ciphertext ?? null,
              nonce: e2e?.nonce ?? null,
              keyVersion: Number.isFinite(Number(e2e?.keyVersion)) ? Number(e2e.keyVersion) : null,
              senderDeviceId: typeof e2e?.senderDeviceId === "string" ? e2e.senderDeviceId : null,
            },
            include: {
              sender: { select: { id: true, full_name: true } },
            },
          });
          if (attachmentIds.length > 0) {
            await tx.discussionAttachment.updateMany({
              where: {
                id: { in: attachmentIds },
                uploadedById: Number(socketUser.id),
                messageId: null,
              },
              data: { messageId: created.id, groupId: serverId, status: "LINKED" },
            });
          }
          const members = await tx.discussionGroupMembership.findMany({
            where: {
              groupId: serverId,
              leftAt: null,
              isActive: true,
              userId: { not: Number(socketUser.id) },
            },
            select: {
              userId: true,
              user: { select: { number: true, full_name: true } },
            },
          });
          const memberRows = members.map((m) => ({
            userId: m.userId,
            number: m.user?.number ?? "",
            full_name: m.user?.full_name ?? "",
          }));
          const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));
          const memberIds = members.map((m) => Number(m.userId));
          const notViewingIds = memberIds.filter((id) => !isUserViewingChannel(id, channelId));
          const plaintext = e2eeEnabled ? "" : hasTextCh ? effectiveContentCh : "";
          const handles = extractMentionHandles(plaintext);
          const mentionUserIds = new Set(
            resolveMentionUserIds(handles, memberRows, Number(socketUser.id)).filter((id) =>
              memberIdSet.has(id)
            )
          );
          const messageRecipients = notViewingIds.filter((rid) => !mentionUserIds.has(rid));
          if (messageRecipients.length > 0) {
            await tx.discussionNotification.createMany({
              data: messageRecipients.map((userId) => ({
                userId,
                groupId: serverId,
                messageId: created.id,
                type: "MESSAGE",
                payload: {
                  groupId: serverId,
                  channelId,
                  messageId: created.id,
                  senderId: Number(socketUser.id),
                  senderName: anonymousSafeSenderName({
                    isAnonymous: isAnonymousFlagCh,
                    sender: created.sender,
                  }),
                },
              })),
            });
          }
          const mentionRecipients = [...mentionUserIds].filter((id) => notViewingIds.includes(id));
          if (mentionRecipients.length > 0) {
            await tx.discussionNotification.createMany({
              data: mentionRecipients.map((userId) => ({
                userId,
                groupId: serverId,
                messageId: created.id,
                type: "MENTION",
                payload: {
                  groupId: serverId,
                  channelId,
                  messageId: created.id,
                  senderId: Number(socketUser.id),
                  senderName: anonymousSafeSenderName({
                    isAnonymous: isAnonymousFlagCh,
                    sender: created.sender,
                  }),
                },
              })),
            });
          }
          if (parentMessageIdCh != null) {
            const rootId = await resolveThreadRootMessageId(tx, {
              groupId: serverId,
              channelId,
              replyParentMessageId: parentMessageIdCh,
            });
            if (rootId != null) {
              const threadTargets = await collectThreadParticipantSenderIds(tx, {
                groupId: serverId,
                channelId,
                rootMessageId: rootId,
                excludeUserId: Number(socketUser.id),
              });
              if (threadTargets.length > 0) {
                await tx.discussionNotification.createMany({
                  data: threadTargets.map((uid) => ({
                    userId: uid,
                    groupId: serverId,
                    messageId: created.id,
                    type: "THREAD",
                    payload: {
                      groupId: serverId,
                      channelId,
                      messageId: created.id,
                      threadRootMessageId: rootId,
                      senderId: Number(socketUser.id),
                      senderName: anonymousSafeSenderName({
                        isAnonymous: isAnonymousFlagCh,
                        sender: created.sender,
                      }),
                    },
                  })),
                });
              }
            }
          }
          const activeUsers = await getActiveDiscussionUserIdSet(notViewingIds);
          const onlineNotViewingIds = notViewingIds.filter((id) => activeUsers.has(id));
          const offlineIds = notViewingIds.filter((id) => !activeUsers.has(id));
          const mutedRows =
            onlineNotViewingIds.length > 0
              ? await tx.discussionMuteSetting.findMany({
                  where: {
                    userId: { in: onlineNotViewingIds },
                    groupId: serverId,
                    OR: [{ until: null }, { until: { gt: new Date() } }],
                  },
                  select: { userId: true },
                })
              : [];
          const mutedUserSet = new Set(mutedRows.map((row) => Number(row.userId)));
          let popupRecipientIds = onlineNotViewingIds.filter((id) => !mutedUserSet.has(id));
          if (popupRecipientIds.length > 0) {
            popupRecipientIds = await excludeDoNotDisturbUserIds(tx, popupRecipientIds);
          }
          const full = await tx.discussionMessage.findUnique({
            where: { id: created.id },
            include: {
              sender: { select: { id: true, full_name: true } },
              attachments: true,
            },
          });
          return {
            message: full,
            popupRecipientIds,
            onlineNotViewingIds,
            offlineIds,
          };
        });
        await touchDiscussionSession(socket);
        const channelMembershipCh = await prisma.discussionGroupMembership.findFirst({
          where: {
            groupId: serverId,
            userId: Number(socketUser.id),
            leftAt: null,
            isActive: true,
          },
        });
        const rawOutMsg = {
          ...result.message,
          channelId,
          serverId,
          parentMessageId: result.message?.parentMessageId ?? null,
        };
        const outMsg = applyAnonymousSenderPolicy(
          rawOutMsg,
          Number(socketUser.id),
          channelMembershipCh
        );
        const wsMsg = rawOutMsg.isAnonymous
          ? applyAnonymousSenderPolicy(rawOutMsg, null, null, { broadcast: true })
          : rawOutMsg;
        fanout.emitToRoom(discussionChannelRoom(channelId), "message:new", wsMsg);
        fanout.emitToRoom(discussionChannelRoom(channelId), "discussion:message:new", wsMsg);
        fanout.emitToRoom(discussionRoom(serverId), "discussion:message:new", wsMsg);
        for (const recipientUserId of result.popupRecipientIds) {
          fanout.emitToUser(recipientUserId, "notification:new", {
            type: "MESSAGE",
            groupId: serverId,
            channelId,
            messageId: result.message?.id,
            senderId: Number(socketUser.id),
            senderName: anonymousSafeSenderName(rawOutMsg),
            createdAt: new Date().toISOString(),
          });
        }
        await emitUnreadUpdateToUsers(result.onlineNotViewingIds);
        metricTimerEnd("messages.send_total.ms", started);
        return ackSuccess(ack, {
          message: outMsg,
          notification: {
            onlineRecipients: result.onlineNotViewingIds.length,
            offlineRecipients: result.offlineIds.length,
            popupRecipients: result.popupRecipientIds.length,
          },
        });
      }

      const groupDmId = Number(payload?.groupDmId);
      if (Number.isFinite(groupDmId) && groupDmId > 0) {
        const content = typeof payload?.content === "string" ? payload.content.trim() : "";
        const hasText = content.length > 0;
        if (!hasText) {
          return ackOrEmitError(socket, ack, "INVALID_MESSAGE", "content is required");
        }
        const gdmMember = await prisma.groupDmMember.findFirst({
          where: { groupDmId, userId: Number(socketUser.id), leftAt: null },
          include: { groupDm: { select: { id: true, archivedAt: true } } },
        });
        if (!gdmMember?.groupDm || gdmMember.groupDm.archivedAt) {
          return ackOrEmitError(socket, ack, "FORBIDDEN", "Not an active member of this group DM");
        }
        if (!gdmMember.canPost) {
          return ackOrEmitError(socket, ack, "FORBIDDEN", "Posting is disabled for you in this group DM");
        }
        const gdmResult = await prisma.$transaction(async (tx) => {
          const created = await tx.discussionMessage.create({
            data: {
              groupId: null,
              channelId: null,
              groupDmId,
              senderId: Number(socketUser.id),
              content,
              messageType: messageTypeUpper,
            },
            include: {
              sender: { select: { id: true, full_name: true } },
            },
          });
          const others = await tx.groupDmMember.findMany({
            where: { groupDmId, userId: { not: Number(socketUser.id) }, leftAt: null },
            select: {
              userId: true,
              user: { select: { number: true, full_name: true } },
            },
          });
          const memberRows = others.map((o) => ({
            userId: o.userId,
            number: o.user?.number ?? "",
            full_name: o.user?.full_name ?? "",
          }));
          const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));
          const otherIds = others.map((o) => Number(o.userId));
          const notViewingIds = otherIds.filter((id) => !isUserViewingGroupDm(id, groupDmId));
          const handles = extractMentionHandles(content);
          const mentionUserIds = new Set(
            resolveMentionUserIds(handles, memberRows, Number(socketUser.id)).filter((id) =>
              memberIdSet.has(id)
            )
          );
          const messageRecipients = notViewingIds.filter((rid) => !mentionUserIds.has(rid));
          if (messageRecipients.length > 0) {
            await tx.discussionNotification.createMany({
              data: messageRecipients.map((userId) => ({
                userId,
                groupId: null,
                messageId: created.id,
                type: "MESSAGE",
                payload: {
                  groupDmId,
                  messageId: created.id,
                  senderId: Number(socketUser.id),
                  senderName: created.sender?.full_name ?? null,
                },
              })),
            });
          }
          const mentionRecipients = [...mentionUserIds].filter((id) => notViewingIds.includes(id));
          if (mentionRecipients.length > 0) {
            await tx.discussionNotification.createMany({
              data: mentionRecipients.map((userId) => ({
                userId,
                groupId: null,
                messageId: created.id,
                type: "MENTION",
                payload: {
                  groupDmId,
                  messageId: created.id,
                  senderId: Number(socketUser.id),
                  senderName: created.sender?.full_name ?? null,
                },
              })),
            });
          }
          const activeUsers = await getActiveDiscussionUserIdSet(notViewingIds);
          const onlineNotViewingIds = notViewingIds.filter((id) => activeUsers.has(id));
          const offlineIds = notViewingIds.filter((id) => !activeUsers.has(id));
          let popupRecipientIds = onlineNotViewingIds;
          if (popupRecipientIds.length > 0) {
            popupRecipientIds = await excludeDoNotDisturbUserIds(tx, popupRecipientIds);
          }
          const full = await tx.discussionMessage.findUnique({
            where: { id: created.id },
            include: {
              sender: { select: { id: true, full_name: true } },
              attachments: true,
              reactions: true,
            },
          });
          return {
            message: full,
            popupRecipientIds,
            onlineNotViewingIds,
            offlineIds,
          };
        });
        await touchDiscussionSession(socket);
        const gdmOut = { ...gdmResult.message, groupDmId };
        fanout.emitToRoom(discussionGroupDmRoom(groupDmId), "message:new", gdmOut);
        fanout.emitToRoom(discussionGroupDmRoom(groupDmId), "groupdm:message:new", gdmOut);
        for (const recipientUserId of gdmResult.popupRecipientIds) {
          fanout.emitToUser(recipientUserId, "notification:new", {
            type: "MESSAGE",
            groupId: null,
            groupDmId,
            messageId: gdmResult.message?.id,
            senderId: Number(socketUser.id),
            senderName: gdmResult.message?.sender?.full_name ?? null,
            createdAt: new Date().toISOString(),
          });
        }
        await emitUnreadUpdateToUsers(gdmResult.onlineNotViewingIds);
        metricTimerEnd("messages.send_total.ms", started);
        return ackSuccess(ack, {
          message: gdmOut,
          notification: {
            onlineRecipients: gdmResult.onlineNotViewingIds.length,
            offlineRecipients: gdmResult.offlineIds.length,
            popupRecipients: gdmResult.popupRecipientIds.length,
          },
        });
      }

      const groupId = Number(payload?.groupId);
      if (!Number.isFinite(groupId)) {
        return ackOrEmitError(socket, ack, "INVALID_GROUP", "groupId or channelId or groupDmId is required");
      }

      const membership = await getDiscussionMembership(groupId, socketUser.id);
      if (!membership) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "User is not a member of this group");
      }
      if (!membership.canPost) {
        return ackOrEmitError(socket, ack, "FORBIDDEN", "Posting is disabled for this user");
      }

      const parentMessageId = Number.isFinite(Number(payload?.parentMessageId))
        ? Number(payload.parentMessageId)
        : null;
      if (parentMessageId != null) {
        const parent = await prisma.discussionMessage.findFirst({
          where: { id: parentMessageId, groupId, deletedAt: null },
          select: { id: true },
        });
        if (!parent) {
          return ackOrEmitError(socket, ack, "INVALID_PARENT", "parentMessageId not found in this group");
        }
      }

      const e2eeEnabled = membership.group?.e2eeEnabled !== false;
      if (e2eeEnabled) {
        if (
          !e2e ||
          typeof e2e.ciphertext !== "string" ||
          !e2e.ciphertext ||
          typeof e2e.nonce !== "string" ||
          !e2e.nonce ||
          !Number.isFinite(Number(e2e.keyVersion)) ||
          typeof e2e.senderDeviceId !== "string" ||
          !e2e.senderDeviceId
        ) {
          return ackOrEmitError(
            socket,
            ack,
            "E2E_REQUIRED",
            "ciphertext, nonce, keyVersion, senderDeviceId are required for E2E groups"
          );
        }
      }

      if (attachmentIds.length > 0) {
        const pendingAttachments = await prisma.discussionAttachment.findMany({
          where: {
            id: { in: attachmentIds },
            uploadedById: Number(socketUser.id),
            status: "PENDING",
            messageId: null,
            OR: [{ groupId }, { groupId: null }],
          },
          select: { id: true },
        });
        if (pendingAttachments.length !== attachmentIds.length) {
          return ackOrEmitError(
            socket,
            ack,
            "INVALID_ATTACHMENT",
            "Some attachments are invalid or unavailable"
          );
        }
      }

      const rawContentGr = typeof payload?.content === "string" ? payload.content : "";
      let effectiveContentGr = "";
      let hasTextGr = false;
      let messageTypeGr = messageTypeUpper;
      let isAnonymousFlagGr = false;
      if (e2eeEnabled) {
        effectiveContentGr = rawContentGr.trim();
        hasTextGr = effectiveContentGr.length > 0;
        messageTypeGr = attachmentIds.length > 0 && !hasTextGr ? "MEDIA" : messageTypeUpper;
      } else {
        const derivedGr = deriveQuestionFields({
          content: rawContentGr,
          messageType: messageTypeUpper,
          postAsQuestion: Boolean(payload?.postAsQuestion),
          isAnonymous: Boolean(payload?.isAnonymous),
          parentMessageId,
        });
        effectiveContentGr = derivedGr.contentStored.trim();
        hasTextGr = effectiveContentGr.length > 0;
        messageTypeGr = attachmentIds.length > 0 && !hasTextGr ? "MEDIA" : derivedGr.messageType;
        isAnonymousFlagGr = derivedGr.isAnonymous;
        if (messageTypeGr !== "QUESTION") isAnonymousFlagGr = false;
      }
      if (!hasTextGr && attachmentIds.length === 0) {
        return ackOrEmitError(socket, ack, "INVALID_MESSAGE", "content or attachmentIds required");
      }
      if (messageTypeGr === "QUESTION" && !hasTextGr) {
        return ackOrEmitError(socket, ack, "INVALID_MESSAGE", "Question text is required");
      }

      const result = await prisma.$transaction(async (tx) => {
        const created = await tx.discussionMessage.create({
          data: {
            groupId,
            senderId: Number(socketUser.id),
            parentMessageId: parentMessageId ?? undefined,
            content: e2eeEnabled ? null : hasTextGr ? effectiveContentGr : null,
            messageType: messageTypeGr,
            isAnonymous: isAnonymousFlagGr,
            ciphertext: e2e?.ciphertext ?? null,
            nonce: e2e?.nonce ?? null,
            keyVersion: Number.isFinite(Number(e2e?.keyVersion)) ? Number(e2e.keyVersion) : null,
            senderDeviceId: typeof e2e?.senderDeviceId === "string" ? e2e.senderDeviceId : null,
          },
          include: {
            sender: { select: { id: true, full_name: true } },
          },
        });

        if (attachmentIds.length > 0) {
          await tx.discussionAttachment.updateMany({
            where: {
              id: { in: attachmentIds },
              uploadedById: Number(socketUser.id),
              messageId: null,
            },
            data: { messageId: created.id, groupId, status: "LINKED" },
          });
        }

        const members = await tx.discussionGroupMembership.findMany({
          where: {
            groupId,
            leftAt: null,
            isActive: true,
            userId: { not: Number(socketUser.id) },
          },
          select: {
            userId: true,
            user: { select: { id: true, number: true, full_name: true } },
          },
        });
        const memberRows = members.map((m) => ({
          userId: m.userId,
          number: m.user?.number ?? "",
          full_name: m.user?.full_name ?? "",
        }));
        const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));
        const memberIds = members.map((m) => Number(m.userId));
        const notViewingIds = memberIds.filter((id) => !isUserViewingGroup(id, groupId));

        const plaintext = e2eeEnabled ? "" : hasTextGr ? effectiveContentGr : "";
        const handles = extractMentionHandles(plaintext);
        const mentionUserIds = new Set(
          resolveMentionUserIds(handles, memberRows, Number(socketUser.id)).filter((id) =>
            memberIdSet.has(id)
          )
        );
        const messageRecipients = notViewingIds.filter((rid) => !mentionUserIds.has(rid));
        if (messageRecipients.length > 0) {
          await tx.discussionNotification.createMany({
            data: messageRecipients.map((userId) => ({
              userId,
              groupId,
              messageId: created.id,
              type: "MESSAGE",
              payload: {
                groupId,
                messageId: created.id,
                senderId: Number(socketUser.id),
                senderName: anonymousSafeSenderName({
                  isAnonymous: isAnonymousFlagGr,
                  sender: created.sender,
                }),
              },
            })),
          });
        }
        const mentionRecipients = [...mentionUserIds].filter((id) => notViewingIds.includes(id));
        if (mentionRecipients.length > 0) {
          await tx.discussionNotification.createMany({
            data: mentionRecipients.map((userId) => ({
              userId,
              groupId,
              messageId: created.id,
              type: "MENTION",
              payload: {
                groupId,
                messageId: created.id,
                senderId: Number(socketUser.id),
                senderName: anonymousSafeSenderName({
                  isAnonymous: isAnonymousFlagGr,
                  sender: created.sender,
                }),
              },
            })),
          });
        }

        const activeUsers = await getActiveDiscussionUserIdSet(notViewingIds);
        const onlineNotViewingIds = notViewingIds.filter((id) => activeUsers.has(id));
        const offlineIds = notViewingIds.filter((id) => !activeUsers.has(id));
        const mutedRows =
          onlineNotViewingIds.length > 0
            ? await tx.discussionMuteSetting.findMany({
                where: {
                  userId: { in: onlineNotViewingIds },
                  groupId,
                  OR: [{ until: null }, { until: { gt: new Date() } }],
                },
                select: { userId: true },
              })
            : [];
        const mutedUserSet = new Set(mutedRows.map((row) => Number(row.userId)));
        let popupRecipientIds = onlineNotViewingIds.filter((id) => !mutedUserSet.has(id));
        if (popupRecipientIds.length > 0) {
          popupRecipientIds = await excludeDoNotDisturbUserIds(tx, popupRecipientIds);
        }

        const full = await tx.discussionMessage.findUnique({
          where: { id: created.id },
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        });
        return {
          message: full,
          popupRecipientIds,
          onlineNotViewingIds,
          offlineIds,
        };
      });

      await touchDiscussionSession(socket);
      const rawGroupMsg = result.message;
      const outGroupMsg = applyAnonymousSenderPolicy(
        rawGroupMsg,
        Number(socketUser.id),
        membership
      );
      const wsGroupMsg = rawGroupMsg?.isAnonymous
        ? applyAnonymousSenderPolicy(rawGroupMsg, null, null, { broadcast: true })
        : rawGroupMsg;
      fanout.emitToRoom(discussionRoom(groupId), "message:new", wsGroupMsg);
      fanout.emitToRoom(discussionRoom(groupId), "discussion:message:new", wsGroupMsg);
      for (const recipientUserId of result.popupRecipientIds) {
        fanout.emitToUser(recipientUserId, "notification:new", {
          type: "MESSAGE",
          groupId,
          messageId: result.message?.id,
          senderId: Number(socketUser.id),
          senderName: anonymousSafeSenderName(rawGroupMsg),
          createdAt: new Date().toISOString(),
        });
      }
      await emitUnreadUpdateToUsers(result.onlineNotViewingIds);
      metricTimerEnd("messages.send_total.ms", started);
      return ackSuccess(ack, {
        message: outGroupMsg,
        notification: {
          onlineRecipients: result.onlineNotViewingIds.length,
          offlineRecipients: result.offlineIds.length,
          popupRecipients: result.popupRecipientIds.length,
        },
      });
    } catch (error) {
      metricCount("messages.send_failed", 1);
      console.error("message:send failed:", error);
      return ackOrEmitError(socket, ack, "INTERNAL", "Failed to send message");
    }
  });

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
});

initializeSocketAdapter()
  .catch((error) => {
    console.warn("Adapter initialization failed:", error?.message || error);
  })
  .finally(() => {
    httpServer.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
      console.log(`Socket.IO running on http://localhost:${port}`);
      globalThis.__announcementWorkersStop = startAnnouncementBullWorkers();

      if (!isAnnouncementSchedulerEnabled() && process.env.ANNOUNCEMENT_EXPIRE_FALLBACK !== "0") {
        const ms = Math.max(60_000, Number(process.env.ANNOUNCEMENT_EXPIRE_FALLBACK_MS) || 60_000);
        const tick = () => {
          runAnnouncementPublishFallbackScan(prisma).catch((err) => {
            console.error("[announcements] publish fallback scan failed:", err?.message || err);
          });
          runAnnouncementExpiryFallbackScan(prisma).catch((err) => {
            console.error("[announcements] expire fallback scan failed:", err?.message || err);
          });
        };
        tick();
        globalThis.__announcementExpireFallbackTimer = setInterval(tick, ms);
      }

      const NIGHTLY_DISCUSSION_SYNC_MS = 24 * 60 * 60 * 1000;
      setInterval(async () => {
        try {
          const results = await runDiscussionMembershipNightlySync();
          const n = Array.isArray(results) ? results.length : 0;
          console.log(`[discussion] nightly membership sync finished (${n} users)`);
        } catch (err) {
          console.error("[discussion] nightly membership sync failed:", err?.message || err);
        }
      }, NIGHTLY_DISCUSSION_SYNC_MS);

      // Auto-submit expired quiz attempts. Runs every 30 s by default — tight
      // enough that students don't see "12 seconds overdue" before the
      // submission lands, loose enough not to chew CPU. The scan uses the
      // partial index on QuizAttempt(expires_at WHERE submitted_at IS NULL),
      // so the query is cheap even with thousands of historical rows.
      const QUIZ_AUTO_SUBMIT_MS = Math.max(
        5_000,
        Number(process.env.QUIZ_AUTO_SUBMIT_INTERVAL_MS) || 30_000
      );
      const quizTick = async () => {
        try {
          const n = await autoSubmitExpiredAttempts();
          if (n > 0) console.log(`[quiz] auto-submitted ${n} expired attempt(s)`);
        } catch (err) {
          console.error("[quiz] auto-submit scan failed:", err?.message || err);
        }
      };
      // Run once at boot so attempts that expired while the server was down
      // are cleaned up immediately, then settle into the interval cadence.
      quizTick();
      globalThis.__quizAutoSubmitTimer = setInterval(quizTick, QUIZ_AUTO_SUBMIT_MS);
    });
  });

process.on("SIGTERM", async () => {
  try {
    const t = globalThis.__announcementExpireFallbackTimer;
    if (t != null) clearInterval(t);
    globalThis.__announcementExpireFallbackTimer = undefined;
  } catch {}
  try {
    const t = globalThis.__quizAutoSubmitTimer;
    if (t != null) clearInterval(t);
    globalThis.__quizAutoSubmitTimer = undefined;
  } catch {}
  try {
    const stop = globalThis.__announcementWorkersStop;
    if (typeof stop === "function") await stop();
  } catch {}
  try {
    const presenceStore = await presenceStorePromise;
    await presenceStore.shutdown();
  } catch {}
});

export { io, prisma };