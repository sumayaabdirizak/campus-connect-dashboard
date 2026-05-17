import crypto from "crypto";
import { prisma as defaultPrisma } from "../../../db/prisma.js";
import { announcementLog } from "../announcementLogger.js";
import { getBullConnection, isAnnouncementSchedulerEnabled } from "./announcementJobs.service.js";
import { Queue } from "bullmq";

/**
 * Default retention horizons.
 *
 *   AUDIT_RETENTION_DAYS  — FERPA student-record minimum is 5 years; we use 7 by default.
 *   READ_RETENTION_DAYS   — GDPR minimisation: read receipts purge after ~13 months.
 *   DRAFT_RETENTION_*     — stale DRAFT announcements (`updatedAt` older than N days): see `applyStaleDraftRetention`.
 *
 * Configurable via env (`ANNOUNCEMENT_AUDIT_RETENTION_DAYS`, `ANNOUNCEMENT_READ_RETENTION_DAYS`,
 * `ANNOUNCEMENT_DRAFT_RETENTION_DAYS`, `ANNOUNCEMENT_DRAFT_RETENTION_POLICY`).
 */
export const AUDIT_RETENTION_DAYS = Number(process.env.ANNOUNCEMENT_AUDIT_RETENTION_DAYS ?? 365 * 7);
export const READ_RETENTION_DAYS = Number(process.env.ANNOUNCEMENT_READ_RETENTION_DAYS ?? 13 * 30);

/** Stale DRAFT rows: `updatedAt` older than this many days (default 30). */
const _draftDays = Number(process.env.ANNOUNCEMENT_DRAFT_RETENTION_DAYS ?? 30);
export const DRAFT_RETENTION_DAYS = Number.isFinite(_draftDays)
  ? Math.min(3650, Math.max(1, Math.trunc(_draftDays)))
  : 30;

/**
 * `archive` (default) — set status ARCHIVED + isActive false.
 * `delete` — hard-delete row (cascades attachments/targets/etc.).
 */
const _draftPolicy = String(process.env.ANNOUNCEMENT_DRAFT_RETENTION_POLICY ?? "archive").toLowerCase();
export const DRAFT_RETENTION_POLICY = _draftPolicy === "delete" ? "delete" : "archive";

/** @type {Queue | null} */
let retentionQueue = null;

export function getRetentionQueue() {
  const conn = getBullConnection();
  if (!conn) return null;
  if (!retentionQueue) {
    retentionQueue = new Queue("announcement-retention", { connection: conn });
  }
  return retentionQueue;
}

/**
 * Compute the default retention `expiresAt` for an audit row.
 * @param {Date} [createdAt]
 * @returns {Date}
 */
export function defaultAuditExpiresAt(createdAt = new Date()) {
  const t = new Date(createdAt);
  t.setUTCDate(t.getUTCDate() + AUDIT_RETENTION_DAYS);
  return t;
}

/**
 * Compute the default retention `expiresAt` for a read-receipt row.
 * @param {Date} [createdAt]
 * @returns {Date}
 */
export function defaultReadExpiresAt(createdAt = new Date()) {
  const t = new Date(createdAt);
  t.setUTCDate(t.getUTCDate() + READ_RETENTION_DAYS);
  return t;
}

/**
 * One-shot purge — deletes audit and read rows past their retention horizon.
 * Safe to call repeatedly; runs sequentially to keep statement counts small.
 *
 * @param {{ prisma?: import("@prisma/client").PrismaClient, now?: Date }} [opts]
 * @returns {Promise<{ auditPurged: number, readsPurged: number }>}
 */
export async function purgeExpiredAnnouncementRecords(opts = {}) {
  const prisma = opts.prisma ?? defaultPrisma;
  const now = opts.now ?? new Date();

  let auditPurged = 0;
  let readsPurged = 0;

  try {
    const audit = await prisma.announcementAudit.deleteMany({
      where: { expiresAt: { not: null, lte: now } },
    });
    auditPurged = audit.count ?? 0;
  } catch (err) {
    announcementLog("warn", "announcement.retention.audit_purge_failed", {
      message: err?.message ?? String(err),
    });
  }

  try {
    const reads = await prisma.announcementRead.deleteMany({
      where: { expiresAt: { not: null, lte: now } },
    });
    readsPurged = reads.count ?? 0;
  } catch (err) {
    announcementLog("warn", "announcement.retention.read_purge_failed", {
      message: err?.message ?? String(err),
    });
  }

  announcementLog("info", "announcement.retention.purge_complete", {
    auditPurged,
    readsPurged,
    auditRetentionDays: AUDIT_RETENTION_DAYS,
    readRetentionDays: READ_RETENTION_DAYS,
  });

  return { auditPurged, readsPurged };
}

/**
 * Nightly policy: only `Announcement.status === DRAFT` with `updatedAt` before the
 * retention horizon. Published / scheduled / expired / already-archived rows are never selected.
 *
 * @param {{
 *   prisma?: import("@prisma/client").PrismaClient,
 *   now?: Date,
 *   draftRetentionDays?: number,
 *   policy?: "archive" | "delete",
 * }} [opts]
 * @returns {Promise<{ policy: "archive" | "delete", affected: number }>}
 */
export async function applyStaleDraftRetention(opts = {}) {
  const prisma = opts.prisma ?? defaultPrisma;
  const now = opts.now ?? new Date();
  const days = opts.draftRetentionDays ?? DRAFT_RETENTION_DAYS;
  const policyRaw = opts.policy ?? DRAFT_RETENTION_POLICY;
  const policy = String(policyRaw).toLowerCase() === "delete" ? "delete" : "archive";
  const horizonMs = Math.max(1, days) * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - horizonMs);

  const where = {
    status: "DRAFT",
    updatedAt: { lt: cutoff },
  };

  let affected = 0;
  try {
    if (policy === "delete") {
      const r = await prisma.announcement.deleteMany({ where });
      affected = r.count ?? 0;
    } else {
      const r = await prisma.announcement.updateMany({
        where,
        data: { status: "ARCHIVED", isActive: false, version: { increment: 1 } },
      });
      affected = r.count ?? 0;
    }
  } catch (err) {
    announcementLog("warn", "announcement.retention.draft_stale_failed", {
      message: err?.message ?? String(err),
      policy,
    });
    return { policy, affected: 0 };
  }

  announcementLog("info", "announcement.retention.draft_stale_applied", {
    policy,
    affected,
    draftRetentionDays: days,
    cutoffIso: cutoff.toISOString(),
  });

  return { policy, affected };
}

/**
 * Hash a user identifier with a server secret so erased actors remain
 * correlatable across audit rows for integrity (GDPR Art. 17 + Art. 5(1)(e)).
 *
 * @param {number | string} actorId
 * @returns {string}
 */
export function hashActorId(actorId) {
  const secret = process.env.ANNOUNCEMENT_AUDIT_HASH_SECRET ?? "campus-connect-audit-fallback";
  return crypto
    .createHmac("sha256", secret)
    .update(String(actorId))
    .digest("hex")
    .slice(0, 32);
}

/**
 * Anonymise audit rows for a user about to be erased. Sets actorId NULL while
 * preserving an HMAC fingerprint so security investigations can still cluster
 * actions by the same (now-anonymous) actor.
 *
 * Call this from the user-deletion flow BEFORE deleting the user row, since
 * the FK is `onDelete: SetNull` and we want the hash populated.
 *
 * @param {number} userId
 * @param {{ prisma?: import("@prisma/client").PrismaClient }} [opts]
 * @returns {Promise<{ anonymized: number }>}
 */
export async function anonymizeAnnouncementAuditForUser(userId, opts = {}) {
  const prisma = opts.prisma ?? defaultPrisma;
  const hash = hashActorId(userId);
  try {
    const result = await prisma.announcementAudit.updateMany({
      where: { actorId: userId },
      data: { actorId: null, actorIdHash: hash },
    });
    announcementLog("info", "announcement.retention.audit_anonymized", {
      userId,
      anonymized: result.count,
    });
    return { anonymized: result.count };
  } catch (err) {
    announcementLog("error", "announcement.retention.audit_anonymize_failed", {
      userId,
      message: err?.message ?? String(err),
    });
    return { anonymized: 0 };
  }
}

/**
 * Schedule a recurring nightly retention purge via Bull-MQ when the scheduler
 * is enabled. No-op when Redis is unavailable so local dev and tests stay green.
 *
 * @returns {Promise<boolean>} true when a job was scheduled.
 */
export async function scheduleRetentionPurge() {
  if (!isAnnouncementSchedulerEnabled()) return false;
  const q = getRetentionQueue();
  if (!q) return false;
  await q.add(
    "purge",
    {},
    {
      jobId: "announcement-retention:nightly",
      repeat: { pattern: "0 3 * * *" },
      removeOnComplete: true,
      removeOnFail: { age: 24 * 3600 },
    },
  );
  announcementLog("info", "announcement.retention.scheduled");
  return true;
}
