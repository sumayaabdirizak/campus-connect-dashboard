import { app } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { assertEnv, env, getSocketCorsAllowlist } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { setIo } from "./socket/hub.js";
import { createChatHandlers } from "./socket/handlers/chat.js";
import { createDiscussionHandlers } from "./socket/handlers/discussions.js";
import { createSocketAuthMiddleware } from "./socket/middleware/socketAuth.js";
import { registerQuizMonitorHandlers } from "./socket/handlers/quizMonitor.js";
import { createPresenceStore } from "./features/discussions/reliability/presenceStore.js";
import { createFanout } from "./features/discussions/reliability/fanout.js";
import { startAnnouncementBullWorkers } from "./workers/announcementBullmq.js";
import { isAnnouncementSchedulerEnabled } from "./features/announcements/services/announcementJobs.service.js";
import { runAnnouncementExpiryFallbackScan } from "./features/announcements/services/announcementExpiry.service.js";
import { runAnnouncementPublishFallbackScan } from "./features/announcements/services/announcementPublishFallback.service.js";
import { runDiscussionMembershipNightlySync } from "./features/discussions/membershipSync.service.js";
import { autoSubmitExpiredAttempts } from "./services/quizAttempt.service.js";

assertEnv();

const port = Number(env.PORT);
const socketAllowedOrigins = getSocketCorsAllowlist();

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

// Course-chat realtime handlers (presence, typing, messaging) live in
// ./socket/handlers/chat.js; the per-process presence/typing state is held in
// the factory closure. `register(socket)` wires the per-socket events.
const chatHandlers = createChatHandlers(io);

const presenceStorePromise = createPresenceStore();
const discussionHandlers = createDiscussionHandlers(io, { fanout, presenceStorePromise });

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

io.use(createSocketAuthMiddleware());

io.on("connection", (socket) => {
  discussionHandlers.beginSession(socket);
  chatHandlers.register(socket);
  registerQuizMonitorHandlers(socket);
  discussionHandlers.registerEventHandlers(socket);
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
