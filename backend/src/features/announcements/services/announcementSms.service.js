import { announcementLog } from "../announcementLogger.js";
import { findAnnouncementRecipientUserIds } from "./announcementRecipients.service.js";
import { tryConsumeSmsDailySlot } from "./smsRateLimit.service.js";
import { announcementMeetsSmsPriorityGate } from "./smsPriorityGate.service.js";
import { getBullConnection, isAnnouncementSchedulerEnabled } from "./announcementJobs.service.js";

export function redactPhone(phone) {
  const s = String(phone ?? "").replace(/\s+/g, "");
  if (s.length <= 4) return "***";
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

const TWILIO_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.TWILIO_REQUEST_TIMEOUT_MS ?? 15_000),
);
const TWILIO_MAX_ATTEMPTS = Math.max(
  1,
  Math.min(5, Number(process.env.TWILIO_MAX_ATTEMPTS ?? 3)),
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send SMS via Twilio REST API with:
 *  - per-attempt AbortController timeout (default 15s) so a hung Twilio API
 *    can't pin the worker until Node's default keepalive timeout.
 *  - up to TWILIO_MAX_ATTEMPTS total tries (1 initial + retries) with
 *    exponential backoff on network errors and 5xx responses.
 *  - 4xx is not retried (Twilio business-logic failures like invalid phone
 *    number — retrying would burn the rate limit on a doomed send).
 *
 * @param {string} to E.164 preferred
 * @param {string} body
 */
async function sendViaTwilio(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: String(from), Body: body.slice(0, 1400) });

  let lastErr;
  for (let attempt = 1; attempt <= TWILIO_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TWILIO_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: controller.signal,
      });
      if (res.ok) return;
      const text = await res.text().catch(() => "");
      const err = new Error(`Twilio HTTP ${res.status}: ${text.slice(0, 200)}`);
      // Only retry transient (5xx) — 4xx is a permanent business-logic failure.
      if (res.status < 500 || res.status >= 600) throw err;
      lastErr = err;
    } catch (err) {
      lastErr = err;
      // Abort, network error → retryable. `TypeError` from fetch = network.
      const isAbort = err?.name === "AbortError";
      const isNetwork = err?.name === "TypeError" || err?.code === "ECONNRESET";
      const isHttp5xx =
        typeof err?.message === "string" && /Twilio HTTP 5\d\d/.test(err.message);
      if (!(isAbort || isNetwork || isHttp5xx)) {
        throw err;
      }
    } finally {
      clearTimeout(timer);
    }
    if (attempt < TWILIO_MAX_ATTEMPTS) {
      // Exponential backoff: 250ms, 500ms, 1000ms… with small jitter.
      const base = 250 * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 100);
      await sleep(base + jitter);
    }
  }
  throw lastErr ?? new Error("Twilio request failed after retries");
}

const SMS_CAP = Math.min(500, Math.max(1, Number(process.env.ANNOUNCEMENT_SMS_MAX_RECIPIENTS ?? 100)));
const SMS_AUDIT_MAX_ATTEMPTS = Math.max(
  1,
  Math.min(5, Number(process.env.SMS_AUDIT_MAX_ATTEMPTS ?? 3)),
);

/** @type {import("bullmq").Queue | null} */
let smsAuditReplayQueue = null;

/**
 * Lazy-init the durable replay queue. Returns null when BullMQ/Redis isn't
 * available; callers must still log a warning so on-call sees the gap.
 *
 * @returns {Promise<import("bullmq").Queue | null>}
 */
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
 * Persist one SMS audit row. TCPA compliance requires the row to exist for
 * every real Twilio send, so we retry transient DB failures with backoff and
 * — when the DB is still unreachable after retries — enqueue a durable
 * BullMQ "sms-audit-replay" job. The worker for that queue reattempts the
 * write later (see startAnnouncementBullWorkers). On the rare path where
 * Redis is also down, we log at `error` level so on-call sees the gap.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ userId: number, announcementId: number, phoneMasked: string, status: import("@prisma/client").SmsAuditLogStatus, reason?: string | null }} row
 */
async function writeSmsAudit(prisma, row) {
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

  // All in-process retries failed — try to enqueue a durable replay job so
  // the audit row is reconstructed when the DB recovers.
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
          // Idempotency: same (announcementId,userId,status) can be reattempted
          // once per minute window. Avoids dogpiling on a long DB outage.
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

  // Worst case: Redis is also offline. Surface at error level so on-call sees
  // the TCPA audit gap and can reconcile from Twilio logs.
  announcementLog("error", "announcement.sms_audit_lost", {
    announcementId: row.announcementId,
    userId: row.userId,
    status: row.status,
    reason:
      "DB write failed after retries and durable replay queue is unavailable (Redis offline?)",
  });
}

/**
 * Worker entry point for the `announcement-sms-audit-replay` queue. Exported
 * so the BullMQ worker file can wire it up.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ row: { userId: number, announcementId: number, phoneNumber: string, status: string, reason: string | null } }} payload
 */
export async function replaySmsAuditRow(prisma, payload) {
  const row = payload?.row;
  if (!row || typeof row.userId !== "number" || typeof row.announcementId !== "number") {
    return; // malformed payload — drop silently rather than retry forever
  }
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

/**
 * After an announcement is created with `notifySms`, SMS eligible recipients who opted in, pass prefs, rate limit, and priority gate.
 *
 * Order: `smsOptIn` → author `notifySms` (caller) → min priority → daily Redis cap → Twilio (or structured skip).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {import("@prisma/client").Announcement} announcement
 * @param {{ notifySms?: boolean }} [options]
 */
export async function sendAnnouncementSmsNotifications(prisma, announcement, options = {}) {
  if (!options.notifySms) return;

  let recipientIds;
  try {
    recipientIds = await findAnnouncementRecipientUserIds(prisma, announcement);
  } catch (err) {
    announcementLog("warn", "announcement.sms_recipients_failed", {
      announcementId: announcement.id,
      message: err?.message ?? String(err),
    });
    return;
  }
  if (!recipientIds.length) return;

  if (!announcementMeetsSmsPriorityGate(announcement)) {
    announcementLog("info", "announcement.sms_skipped_priority_gate", {
      announcementId: announcement.id,
      priority: announcement.priority,
      minPriority: process.env.ANNOUNCEMENT_SMS_MIN_PRIORITY ?? "",
    });
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: recipientIds.slice(0, 5000) },
      phone: { not: null },
      NOT: { phone: "" },
    },
    select: { id: true, phone: true, smsOptIn: true },
    take: SMS_CAP,
  });

  const title = String(announcement.title ?? "").slice(0, 80);
  const body = `Campus announcement: ${title}`.slice(0, 300);
  const configured = twilioConfigured();

  for (const u of users) {
    const to = String(u.phone).trim();
    const masked = redactPhone(to);
    if (!to) {
      await writeSmsAudit(prisma, {
        userId: u.id,
        announcementId: announcement.id,
        phoneMasked: masked,
        status: "SKIPPED",
        reason: "NO_PHONE",
      });
      continue;
    }
    if (!u.smsOptIn) {
      await writeSmsAudit(prisma, {
        userId: u.id,
        announcementId: announcement.id,
        phoneMasked: masked,
        status: "SKIPPED",
        reason: "SMS_OPT_IN_FALSE",
      });
      continue;
    }

    const { allowed, usedRedis } = await tryConsumeSmsDailySlot(u.id);
    if (!allowed) {
      await writeSmsAudit(prisma, {
        userId: u.id,
        announcementId: announcement.id,
        phoneMasked: masked,
        status: "SKIPPED",
        reason: usedRedis ? "RATE_LIMIT_DAILY" : "RATE_LIMIT",
      });
      announcementLog("info", "announcement.sms_skipped_rate_limit", {
        announcementId: announcement.id,
        userId: u.id,
      });
      continue;
    }

    try {
      if (configured) {
        await sendViaTwilio(to, body);
        await writeSmsAudit(prisma, {
          userId: u.id,
          announcementId: announcement.id,
          phoneMasked: masked,
          status: "SENT",
          reason: null,
        });
        announcementLog("info", "announcement.sms_sent", {
          announcementId: announcement.id,
          userId: u.id,
          to: masked,
        });
      } else {
        await writeSmsAudit(prisma, {
          userId: u.id,
          announcementId: announcement.id,
          phoneMasked: masked,
          status: "SKIPPED",
          reason: "NO_TWILIO_PROVIDER",
        });
        announcementLog("info", "announcement.sms_skipped_no_twilio", {
          announcementId: announcement.id,
          userId: u.id,
          to: masked,
          preview: body,
        });
      }
    } catch (err) {
      await writeSmsAudit(prisma, {
        userId: u.id,
        announcementId: announcement.id,
        phoneMasked: masked,
        status: "FAILED",
        reason: String(err?.message ?? err).slice(0, 500),
      });
      announcementLog("warn", "announcement.sms_send_failed", {
        announcementId: announcement.id,
        userId: u.id,
        to: masked,
        message: err?.message ?? String(err),
      });
    }
  }
}
