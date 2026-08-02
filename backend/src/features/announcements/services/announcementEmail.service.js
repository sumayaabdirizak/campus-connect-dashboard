import { announcementLog } from "../announcementLogger.js";
import { findAnnouncementRecipientUserIds } from "./announcementRecipients.service.js";
import { buildAnnouncementEmailHtml } from "./announcementEmailTemplate.js";
import { sendTransactionalEmail } from "../../../services/transactionalEmail.service.js";

const APP_BASE = () =>
  String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );

/** Cap batch size the same way SMS does — a runaway "everyone" audience shouldn't blow up the mail queue. */
const EMAIL_CAP = Math.min(2000, Math.max(1, Number(process.env.ANNOUNCEMENT_EMAIL_MAX_RECIPIENTS ?? 1000)));

/**
 * Email every eligible recipient the moment an announcement is published —
 * unlike SMS (opt-in via `notifySms`), this always fires on publish since
 * email has no per-message cost/consent concern the way SMS does.
 * Best-effort: never throws, never blocks the create/publish response.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {import("@prisma/client").Announcement} announcement
 */
export async function sendAnnouncementEmailNotifications(prisma, announcement) {
  let recipientIds;
  try {
    recipientIds = await findAnnouncementRecipientUserIds(prisma, announcement);
  } catch (err) {
    announcementLog("warn", "announcement.email_recipients_failed", {
      announcementId: announcement.id,
      message: err?.message ?? String(err),
    });
    return;
  }
  if (!recipientIds.length) return;

  const users = await prisma.user.findMany({
    where: { id: { in: recipientIds.slice(0, EMAIL_CAP) }, email: { not: "" } },
    select: { id: true, email: true, full_name: true },
  });
  if (!users.length) return;

  const title = String(announcement.title ?? "").slice(0, 200);
  const rawBody = announcement.bodyMarkdown || announcement.content || "";
  const body = String(rawBody).replace(/\s+/g, " ").trim().slice(0, 600);
  const absoluteUrl = `${APP_BASE()}/dashboard/announcements?id=${announcement.id}`;

  await Promise.all(
    users.map(async (u) => {
      if (!u.email) return;
      const html = buildAnnouncementEmailHtml({
        recipientName: u.full_name || "there",
        title,
        body,
        priority: announcement.priority,
        absoluteUrl,
      });
      await sendTransactionalEmail({
        to: u.email,
        subject: title || "New announcement",
        html,
      }).catch((err) => {
        announcementLog("warn", "announcement.email_send_failed", {
          announcementId: announcement.id,
          userId: u.id,
          message: err?.message ?? String(err),
        });
      });
    }),
  );
}
