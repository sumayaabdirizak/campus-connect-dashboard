import IORedis from "ioredis";
import { Queue } from "bullmq";
import { announcementLog } from "../announcementLogger.js";

/** @type {IORedis | null} */
let connection = null;

/** @type {Queue | null} */
let publishQueue = null;

/** @type {Queue | null} */
let expireQueue = null;

export function isAnnouncementSchedulerEnabled() {
  return process.env.ANNOUNCEMENTS_SCHEDULER === "on" && Boolean(process.env.REDIS_URL);
}

export function getBullConnection() {
  if (!isAnnouncementSchedulerEnabled()) return null;
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

export function getPublishQueue() {
  const conn = getBullConnection();
  if (!conn) return null;
  if (!publishQueue) {
    publishQueue = new Queue("announcement-publish", { connection: conn });
  }
  return publishQueue;
}

export function getExpireQueue() {
  const conn = getBullConnection();
  if (!conn) return null;
  if (!expireQueue) {
    expireQueue = new Queue("announcement-expire", { connection: conn });
  }
  return expireQueue;
}

/**
 * Sentinel error thrown by {@link enqueueAnnouncementJobsStrict} when the
 * BullMQ scheduler is enabled but a required job could not be enqueued
 * (typically Redis is down). The caller is expected to roll back the
 * surrounding DB transaction and surface a 503 so the client retries.
 */
export class AnnouncementSchedulerUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "AnnouncementSchedulerUnavailableError";
    this.cause = cause;
  }
}

/**
 * Best-effort enqueue. Errors are swallowed and logged — use for non-critical
 * paths (e.g. enqueueing the expire job for a DRAFT being updated, or when
 * the scheduler is not the source of truth for transition). Callers that need
 * to fail the transaction on a missing publish job should use
 * {@link enqueueAnnouncementJobsStrict} instead.
 *
 * @param {import("@prisma/client").Announcement} announcement
 */
export async function enqueueAnnouncementJobs(announcement) {
  try {
    await enqueueAnnouncementJobsStrict(announcement);
  } catch (err) {
    announcementLog("warn", "announcement.job_enqueue_failed", {
      announcementId: announcement.id,
      message: err?.message ?? String(err),
    });
  }
}

/**
 * Strict enqueue: throws {@link AnnouncementSchedulerUnavailableError} when a
 * required SCHEDULED-publish or expire job cannot be enqueued. Use inside a
 * DB transaction so the row is rolled back and the client gets a 503 rather
 * than a silently-orphaned SCHEDULED announcement.
 *
 * Returns silently for DRAFT (no jobs needed) and when the scheduler is
 * intentionally disabled (`ANNOUNCEMENTS_SCHEDULER !== "on"`) — the DB
 * fallback scan in announcementPublishFallback.service.js handles those.
 *
 * @param {import("@prisma/client").Announcement} announcement
 */
export async function enqueueAnnouncementJobsStrict(announcement) {
  if (!isAnnouncementSchedulerEnabled()) return;
  if (String(announcement.status ?? "").toUpperCase() === "DRAFT") return;
  const pubAt = announcement.publishedAt ? new Date(announcement.publishedAt).getTime() : null;
  const now = Date.now();

  if (announcement.status === "SCHEDULED" && pubAt && pubAt > now) {
    const q = getPublishQueue();
    if (!q) {
      throw new AnnouncementSchedulerUnavailableError(
        "Announcement publish queue is unavailable",
      );
    }
    try {
      await q.add(
        "publish",
        { announcementId: announcement.id },
        { jobId: `publish:${announcement.id}`, delay: pubAt - now, removeOnComplete: true },
      );
    } catch (err) {
      throw new AnnouncementSchedulerUnavailableError(
        `Failed to enqueue publish job: ${err?.message ?? String(err)}`,
        err,
      );
    }
    announcementLog("info", "announcement.job_publish_scheduled", {
      announcementId: announcement.id,
      delayMs: pubAt - now,
    });
  }

  if (announcement.expiresAt) {
    const ex = new Date(announcement.expiresAt).getTime();
    if (ex > now) {
      const q = getExpireQueue();
      if (!q) {
        // Expiry is less critical than publish — DB fallback scan also handles
        // it. Don't fail the transaction on a missing expire queue.
        return;
      }
      try {
        await q.add(
          "expire",
          { announcementId: announcement.id },
          { jobId: `expire:${announcement.id}`, delay: ex - now, removeOnComplete: true },
        );
      } catch (err) {
        announcementLog("warn", "announcement.job_expire_enqueue_failed", {
          announcementId: announcement.id,
          message: err?.message ?? String(err),
        });
        return;
      }
      announcementLog("info", "announcement.job_expire_scheduled", {
        announcementId: announcement.id,
        delayMs: ex - now,
      });
    }
  }
}

/**
 * Count SCHEDULED announcements whose publishedAt has passed by more than
 * `thresholdMs` — these are stuck and need operator attention. Used by the
 * overdue-monitor BullMQ ticker and the /admin/scheduled-overdue endpoint.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} [thresholdMs] default 10 minutes
 * @returns {Promise<number>}
 */
export async function countOverdueScheduledAnnouncements(prisma, thresholdMs) {
  const ms = Number.isFinite(thresholdMs) ? Math.max(0, Math.trunc(thresholdMs)) : 10 * 60 * 1000;
  const cutoff = new Date(Date.now() - ms);
  return prisma.announcement.count({
    where: {
      status: "SCHEDULED",
      isActive: true,
      publishedAt: { not: null, lte: cutoff },
    },
  });
}
