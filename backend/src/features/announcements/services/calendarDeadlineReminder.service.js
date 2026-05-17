import webpush from "web-push";
import { prisma } from "../../../db/prisma.js";
import { announcementLog } from "../announcementLogger.js";
import { resolveAnnouncementRoutingTargeting } from "./announcementRouting.service.js";
import { findAnnouncementRecipientUserIds } from "./announcementRecipients.service.js";
import { getIo } from "../../../socket/hub.js";

const HOUR_MS = 60 * 60 * 1000;
const FIRE_WINDOW_MS = 18 * 60 * 1000;

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@localhost";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/**
 * @param {import("socket.io").Server} io
 * @param {string} event
 * @param {unknown} payload
 * @param {Awaited<ReturnType<typeof resolveAnnouncementRoutingTargeting>>} resolvedTargeting
 * @param {import("@prisma/client").Announcement} row
 */
function emitToScopeRooms(io, event, payload, resolvedTargeting, row) {
  switch (row.targetType) {
    case "ALL":
      io.emit(event, payload);
      break;
    case "FACULTY": {
      const facultyId = resolvedTargeting.facultyId ?? row.facultyId;
      if (facultyId != null) io.to(`faculty:${facultyId}`).emit(event, payload);
      break;
    }
    case "DEPARTMENT": {
      const departmentId = resolvedTargeting.departmentId ?? row.departmentId;
      if (departmentId != null) io.to(`department:${departmentId}`).emit(event, payload);
      break;
    }
    case "BATCH": {
      const batchId = resolvedTargeting.batchId ?? row.batchId;
      if (batchId != null) io.to(`batch:${batchId}`).emit(event, payload);
      break;
    }
    case "SECTION": {
      const sectionId = resolvedTargeting.sectionId ?? row.sectionId;
      if (sectionId != null) io.to(`section:${sectionId}`).emit(event, payload);
      break;
    }
    default:
      break;
  }
}

/**
 * @param {import("@prisma/client").Announcement} row
 * @param {'T24H'|'T1H'} phase
 */
async function emitDeadlineReminderSocket(row, phase) {
  const io = getIo();
  if (!io) return;
  const payload = {
    id: row.id,
    title: row.title,
    deadlineAt: row.deadlineAt ? new Date(row.deadlineAt).toISOString() : null,
    phase,
  };
  try {
    const resolvedTargeting = await resolveAnnouncementRoutingTargeting(row);
    emitToScopeRooms(io, "announcement:deadline_reminder", payload, resolvedTargeting, row);
    const recipientIds = await findAnnouncementRecipientUserIds(prisma, row);
    for (const uid of recipientIds) {
      io.to(`user:${uid}`).emit("announcement:deadline_reminder", payload);
    }
  } catch {
    io.emit("announcement:deadline_reminder", payload);
  }
}

/**
 * @param {number} userId
 * @param {{ title: string; body: string; url: string }} n
 */
async function sendWebPushToUser(userId, n) {
  if (process.env.ANNOUNCEMENT_DEADLINE_WEB_PUSH === "0") return;
  if (!configureWebPush()) return;
  const subs = await prisma.webPushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify({ title: n.title, body: n.body, url: n.url });
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        payload,
      );
    } catch {
      /* ignore invalid subscriptions */
    }
  }
}

/**
 * @param {Date} deadline
 * @param {Date} now
 * @param {number} hoursBefore
 */
function inReminderFireWindow(deadline, now, hoursBefore) {
  const target = deadline.getTime() - hoursBefore * HOUR_MS;
  const t = now.getTime();
  return t >= target && t < target + FIRE_WINDOW_MS;
}

/**
 * BullMQ / cron: send T-24h and T-1h reminders once per announcement per phase (`CalendarReminderJob`).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 */
export async function runDeadlineReminderScan(prisma) {
  if (process.env.ANNOUNCEMENT_DEADLINE_REMINDERS === "0") {
    return { skipped: true, reason: "disabled" };
  }
  const now = new Date();
  const horizon = new Date(now.getTime() + 26 * HOUR_MS);
  const rows = await prisma.announcement.findMany({
    where: {
      status: "PUBLISHED",
      isActive: true,
      deadlineAt: { not: null, gt: now, lte: horizon },
    },
    select: {
      id: true,
      title: true,
      content: true,
      deadlineAt: true,
      targetType: true,
      facultyId: true,
      departmentId: true,
      batchId: true,
      sectionId: true,
      imageUrls: true,
      targetRoles: true,
      status: true,
    },
    take: 200,
  });

  let sent24 = 0;
  let sent1 = 0;

  const baseUrl = String(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  const pushUrl = `${baseUrl}/dashboard/calendar`;

  for (const row of rows) {
    if (!row.deadlineAt) continue;
    const deadline = new Date(row.deadlineAt);

    for (const phase of /** @type {const} */ (["T24H", "T1H"])) {
      const hours = phase === "T24H" ? 24 : 1;
      if (!inReminderFireWindow(deadline, now, hours)) continue;

      try {
        await prisma.calendarReminderJob.create({
          data: {
            announcementId: row.id,
            phase,
            sentAt: new Date(),
          },
        });
      } catch (e) {
        if (e?.code === "P2002") continue;
        throw e;
      }

      await emitDeadlineReminderSocket(row, phase);

      const label = phase === "T24H" ? "24 hours" : "1 hour";
      try {
        const recipientIds = await findAnnouncementRecipientUserIds(prisma, row);
        for (const uid of recipientIds) {
          await sendWebPushToUser(uid, {
            title: "Deadline reminder",
            body: `${row.title} — about ${label} remaining`,
            url: pushUrl,
          });
        }
      } catch {
        /* push best-effort */
      }

      if (phase === "T24H") sent24 += 1;
      else sent1 += 1;

      announcementLog("info", "announcement.deadline_reminder_sent", {
        announcementId: row.id,
        phase,
      });
    }
  }

  return { at: now.toISOString(), scanned: rows.length, sentT24H: sent24, sentT1H: sent1 };
}
