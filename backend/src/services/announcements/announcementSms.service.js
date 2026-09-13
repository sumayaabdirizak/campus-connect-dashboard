import { announcementLog } from "./announcementLogger.js";
import { findAnnouncementRecipientUserIds } from "./announcementRecipients.service.js";
import { announcementMeetsSmsPriorityGate } from "./smsPriorityGate.service.js";import { twilioConfigured } from "./sms/twilio.js";
import { SMS_CAP } from "./sms/audit.js";
import { dispatchSmsToUser } from "./sms/dispatchUser.js";

export { redactPhone } from "./sms/twilio.js";
export { replaySmsAuditRow } from "./sms/audit.js";

/**
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

  for (const user of users) {
    await dispatchSmsToUser(prisma, user, announcement.id, body, configured);
  }
}
