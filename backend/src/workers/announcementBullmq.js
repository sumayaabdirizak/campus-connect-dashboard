import { Worker, Queue } from "bullmq";
import { prisma } from "../db/prisma.js";
import { announcementLog } from "../features/announcements/announcementLogger.js";
import {
  getBullConnection,
  isAnnouncementSchedulerEnabled,
  countOverdueScheduledAnnouncements,
} from "../features/announcements/services/announcementJobs.service.js";
import {
  applyStaleDraftRetention,
  purgeExpiredAnnouncementRecords,
  scheduleRetentionPurge,
} from "../features/announcements/services/announcementRetention.service.js";
import { publishScheduledAnnouncementIfDue } from "../features/announcements/services/announcementPublishFallback.service.js";

/** @type {Worker[]} */
const workers = [];

export function startAnnouncementBullWorkers() {
  if (!isAnnouncementSchedulerEnabled()) {
    announcementLog("info", "announcement.bullmq_skipped", { reason: "scheduler_off_or_no_redis" });
    return async () => {};
  }
  const connection = getBullConnection();
  if (!connection) return async () => {};

  const publishWorker = new Worker(
    "announcement-publish",
    async (job) => {
      const announcementId = Number(job.data?.announcementId);
      if (!Number.isFinite(announcementId)) return;
      const did = await publishScheduledAnnouncementIfDue(prisma, announcementId, { source: "bullmq" });
      if (did) announcementLog("info", "announcement.worker_published", { announcementId });
    },
    { connection },
  );

  const expireWorker = new Worker(
    "announcement-expire",
    async (job) => {
      const announcementId = Number(job.data?.announcementId);
      if (!Number.isFinite(announcementId)) return;
      const { expireAnnouncementIfDue } = await import(
        "../features/announcements/services/announcementExpiry.service.js"
      );
      const did = await expireAnnouncementIfDue(prisma, announcementId);
      if (did) announcementLog("info", "announcement.worker_expired", { announcementId });
    },
    { connection },
  );

  const digestQueue = new Queue("announcement-email-digest", { connection });
  digestQueue
    .add("daily", {}, { repeat: { pattern: "0 7 * * *" }, removeOnComplete: true })
    .catch(() => {});

  const digestWorker = new Worker(
    "announcement-email-digest",
    async () => {
      const { runAnnouncementDigestEmailJob } = await import(
        "../features/announcements/services/announcementDigestEmail.service.js"
      );
      const out = await runAnnouncementDigestEmailJob(prisma);
      announcementLog("info", "announcement.digest_worker_done", out);
    },
    { connection },
  );

  const snapshotQueue = new Queue("announcement-analytics-snapshot", { connection });
  void snapshotQueue
    .add("nightly", {}, { repeat: { pattern: "25 2 * * *" }, removeOnComplete: true })
    .catch(() => {});

  const snapshotWorker = new Worker(
    "announcement-analytics-snapshot",
    async () => {
      const { runAnnouncementAnalyticsSnapshotJob } = await import(
        "../features/announcements/services/announcementAnalyticsSnapshot.service.js"
      );
      const out = await runAnnouncementAnalyticsSnapshotJob(prisma);
      announcementLog("info", "announcement.analytics_snapshot_tick", out);
    },
    { connection },
  );

  const retentionWorker = new Worker(
    "announcement-retention",
    async () => {
      await purgeExpiredAnnouncementRecords();
      await applyStaleDraftRetention();
    },
    { connection },
  );

  const reminderQueue = new Queue("announcement-deadline-reminders", { connection });
  void reminderQueue
    .add("tick", {}, { repeat: { pattern: "*/12 * * * *" }, removeOnComplete: true })
    .catch(() => {});

  const reminderWorker = new Worker(
    "announcement-deadline-reminders",
    async () => {
      const { runDeadlineReminderScan } = await import(
        "../features/announcements/services/calendarDeadlineReminder.service.js"
      );
      const out = await runDeadlineReminderScan(prisma);
      announcementLog("info", "announcement.deadline_reminder_tick", out);
    },
    { connection },
  );

  /**
   * SMS audit replay — drains the durable queue populated by
   * announcementSms.service.js when in-process retries to write the audit
   * row exhausted. Reattempts give the DB time to recover after a transient
   * outage so TCPA audit rows aren't lost.
   */
  const smsAuditReplayWorker = new Worker(
    "announcement-sms-audit-replay",
    async (job) => {
      const { replaySmsAuditRow } = await import(
        "../features/announcements/services/announcementSms.service.js"
      );
      await replaySmsAuditRow(prisma, job.data ?? {});
    },
    { connection },
  );

  /**
   * Overdue-scheduled monitor — emits a structured log every 5 minutes with
   * the count of SCHEDULED announcements whose publishedAt has passed by
   * more than the threshold. Ops dashboards alert on `count > 0`.
   */
  const overdueQueue = new Queue("announcement-scheduled-overdue", { connection });
  void overdueQueue
    .add("tick", {}, { repeat: { pattern: "*/5 * * * *" }, removeOnComplete: true })
    .catch(() => {});

  const overdueThresholdMs =
    Math.max(60, Number(process.env.ANNOUNCEMENT_SCHEDULED_OVERDUE_THRESHOLD_SEC ?? 600)) * 1000;

  const overdueWorker = new Worker(
    "announcement-scheduled-overdue",
    async () => {
      try {
        const count = await countOverdueScheduledAnnouncements(prisma, overdueThresholdMs);
        // Always emit so dashboards see a heartbeat; `level: "error"` for
        // count > 0 makes it trivial to wire up alerting on log severity.
        announcementLog(count > 0 ? "error" : "info", "announcements.scheduled.overdue", {
          count,
          thresholdMs: overdueThresholdMs,
        });
      } catch (err) {
        announcementLog("warn", "announcements.scheduled.overdue_check_failed", {
          message: err?.message ?? String(err),
        });
      }
    },
    { connection },
  );

  workers.push(
    publishWorker,
    expireWorker,
    digestWorker,
    snapshotWorker,
    reminderWorker,
    retentionWorker,
    overdueWorker,
    smsAuditReplayWorker,
  );

  void scheduleRetentionPurge().catch((err) => {
    announcementLog("warn", "announcement.retention.schedule_failed", {
      message: err?.message ?? String(err),
    });
  });

  return async () => {
    await Promise.all(workers.map((w) => w.close()));
    workers.length = 0;
  };
}
