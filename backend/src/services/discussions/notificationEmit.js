import { getIo } from "../../socket/hub.js";
import { buildUnreadSocketPayload } from "./buildUnreadPayload.js";

function normalizeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events
    .map((event) => ({
      userId: Number(event?.userId),
      notification: event?.notification ?? null,
    }))
    .filter((event) => Number.isFinite(event.userId) && event.userId > 0);
}

/**
 * Emit realtime notification events created by REST discussion endpoints.
 *
 * Socket.IO is installed in server.js after app.js is imported, so this module
 * must tolerate being loaded before an io instance exists.
 */
export async function emitDiscussionNotificationEvents(events) {
  const io = getIo();
  const normalized = normalizeEvents(events);
  if (!io || normalized.length === 0) return;

  const touchedUserIds = new Set();
  for (const { userId, notification } of normalized) {
    touchedUserIds.add(userId);
    io.to(`user:${userId}`).emit("notification:new", notification);
  }

  for (const userId of touchedUserIds) {
    try {
      const unread = await buildUnreadSocketPayload(userId);
      io.to(`user:${userId}`).emit("unread:update", unread);
    } catch (error) {
      console.warn("Failed to emit unread update", {
        userId,
        message: error?.message || error,
      });
    }
  }
}
