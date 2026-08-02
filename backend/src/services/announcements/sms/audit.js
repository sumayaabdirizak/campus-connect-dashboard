import { announcementLog } from "../announcementLogger.js";
import { getBullConnection, isAnnouncementSchedulerEnabled } from "../announcementJobs.service.js";

export const SMS_CAP = Math.min(500, Math.max(1, Number(process.env.ANNOUNCEMENT_SMS_MAX_RECIPIENTS ?? 100)));
export const SMS_AUDIT_MAX_ATTEMPTS = Math.max(
  1,
  Math.min(5, Number(process.env.SMS_AUDIT_MAX_ATTEMPTS ?? 3)),
);

/** @type {import("bullmq").Queue | null} */
let smsAuditReplayQueue = null;

async function getSmsAuditReplayQueue() {
  if (smsAuditReplayQueue) return smsAuditReplayQueue;
  if (!isAnnouncementSchedulerEnabled()) return null;
  const connection = getBullConnection();
  if (!connection) return null;
  const { Queue } = await import("bullmq");
  smsAuditReplayQueue = new Queue("announcement-sms-audit-replay", { connection });
  return smsAuditReplayQueue;
}

function smsAuditSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ userId: number, announcementId: number, phoneMasked: string, status: import("@prisma/client").SmsAuditLogStatus, reason?: string | null }} row
 */
export async function writeSmsAudit(prisma, row) {
  const data = {
    userId: row.userId,
    announcementId: row.announcementId,
    phoneNumber: row.phoneMasked,
    status: row.status,
    reason: row.reason ?? null,
  };

  let lastErr;
  for (let attempt = 1; attempt <= SMS_AUDIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      await prisma.smsAuditLog.create({ data });
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < SMS_AUDIT_MAX_ATTEMPTS) {
        await smsAuditSleep(200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100));
      }
    }
  }

  announcementLog("warn", "announcement.sms_audit_write_failed", {
    announcementId: row.announcementId,
    userId: row.userId,
    attempts: SMS_AUDIT_MAX_ATTEMPTS,
    message: lastErr?.message ?? String(lastErr),
  });

  try {
    const queue = await getSmsAuditReplayQueue();
    if (queue) {
      await queue.add(
        "replay",
        { row: data, queuedAt: new Date().toISOString() },
        {
          jobId: `audit:${row.announcementId}:${row.userId}:${row.status}:${Math.floor(Date.now() / 60_000)}`,
          attempts: 5,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      announcementLog("info", "announcement.sms_audit_replay_enqueued", {
        announcementId: row.announcementId,
        userId: row.userId,
      });
      return;
    }
  } catch (err) {
    announcementLog("error", "announcement.sms_audit_replay_enqueue_failed", {
      announcementId: row.announcementId,
      userId: row.userId,
      message: err?.message ?? String(err),
    });
    return;
  }

  announcementLog("error", "announcement.sms_audit_lost", {
    announcementId: row.announcementId,
    userId: row.userId,
    status: row.status,
    reason: "DB write failed after retries and durable replay queue is unavailable (Redis offline?)",
  });
}

/** @param {import("@prisma/client").PrismaClient} prisma @param {{ row: object }} payload */
export async function replaySmsAuditRow(prisma, payload) {
  const row = payload?.row;
  if (!row || typeof row.userId !== "number" || typeof row.announcementId !== "number") return;
  await prisma.smsAuditLog.create({
    data: {
      userId: row.userId,
      announcementId: row.announcementId,
      phoneNumber: row.phoneNumber,
      status: row.status,
      reason: row.reason ?? null,
    },
  });
  announcementLog("info", "announcement.sms_audit_replayed", {
    announcementId: row.announcementId,
    userId: row.userId,
  });
}
