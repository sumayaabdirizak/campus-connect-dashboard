import { prisma } from "../../../db/prisma.js";
import { metricCount, metricTimerEnd, metricTimerStart } from "../../../features/discussions/reliability/metrics.js";
import { buildUnreadSocketPayload } from "../../../features/discussions/buildUnreadPayload.js";
import { getDiscussionPresenceWindowMs } from "../../../features/discussions/discussionPresence.js";

const DISCUSSION_SERVER_ID = process.env.SERVER_ID || process.env.HOSTNAME || "api";

/**
 * @param {{ fanout: { emitToUser: Function }, presenceStorePromise: Promise<any> }} deps
 */
export function createDiscussionSessionHelpers({ fanout, presenceStorePromise }) {
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

  return {
    emitUnreadUpdateToUsers,
    emitPendingNotificationsToSocket,
    registerDiscussionSession,
    touchDiscussionSession,
    pulseDiscussionPresenceHeartbeat,
    closeDiscussionSession,
    getActiveDiscussionUserIdSet,
    getDiscussionMembership,
    ensureTypingDisplayName,
  };
}
