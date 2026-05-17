import { metricCount, metricTimerEnd, metricTimerStart } from "./metrics.js";

/**
 * Delivery queue with bounded retries for realtime emits.
 * Can run on top of socket.io local emitter; cross-node handled by redis adapter (if configured).
 */
export function createFanout(io) {
  const maxRetries = Math.max(0, Number(process.env.DISCUSSION_FANOUT_MAX_RETRIES || 2));
  const retryDelayMs = Math.max(50, Number(process.env.DISCUSSION_FANOUT_RETRY_DELAY_MS || 150));

  function scheduleEmit({ room, event, payload, attempt = 0 }) {
    const startedAt = metricTimerStart();
    setTimeout(() => {
      try {
        io.to(room).emit(event, payload);
        metricCount("fanout.emit.success", 1);
        metricTimerEnd("fanout.emit.ms", startedAt);
      } catch (error) {
        metricCount("fanout.emit.failure", 1);
        console.error("Fanout emit failed", {
          room,
          event,
          attempt,
          error: error?.message || error,
        });
        if (attempt < maxRetries) {
          metricCount("fanout.emit.retry", 1);
          scheduleEmit({ room, event, payload, attempt: attempt + 1 });
        } else {
          metricCount("fanout.emit.dropped", 1);
          console.error("Fanout emit dropped after retries", { room, event });
        }
      }
    }, attempt === 0 ? 0 : retryDelayMs * attempt);
  }

  return {
    emitToRoom(room, event, payload) {
      scheduleEmit({ room, event, payload, attempt: 0 });
    },
    emitToUser(userId, event, payload) {
      scheduleEmit({ room: `user:${Number(userId)}`, event, payload, attempt: 0 });
    },
  };
}

