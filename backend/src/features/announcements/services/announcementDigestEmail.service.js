import { loadUserAnnouncementScope } from "../../../utils/userAnnouncementScope.js";
import { visibilityUserFromLoaded } from "./announcementService.js";
import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  getUnreadCount,
  isPrismaAnnouncementSchemaDriftError,
} from "./announcementVisibility.service.js";
import { announcementLog } from "../announcementLogger.js";

const DEFAULT_DIGEST_BASE = "http://localhost:3000";

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} userId
 * @param {import("./announcementVisibility.service.js").VisibleAnnouncementUser} vu
 */
async function listUnreadAnnouncementTitles(prisma, userId, vu) {
  const base = buildVisibleAnnouncementsWhere(vu);
  const where = {
    AND: [base, { status: { not: "DRAFT" } }, { reads: { none: { userId } } } }],
  };
  try {
    return await prisma.announcement.findMany({
      where,
      select: { id: true, title: true },
      take: 20,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    return prisma.announcement.findMany({
      where: {
        AND: [buildVisibleAnnouncementsWhereLegacy(vu), { reads: { none: { userId } } }],
      },
      select: { id: true, title: true },
      take: 20,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {{ to: string; subject: string; html: string }} opts
 */
async function sendViaResend(opts) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "missing_resend_key" };
  const from = process.env.ANNOUNCEMENT_DIGEST_FROM || "Campus <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `resend_${res.status}`, detail: body.slice(0, 500) };
  }
  return { ok: true };
}

/**
 * @param {{ to: string; subject: string; html: string }} opts
 */
async function sendViaSendGrid(opts) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return { ok: false, reason: "missing_sendgrid_key" };
  const from = process.env.ANNOUNCEMENT_DIGEST_FROM_EMAIL;
  if (!from) return { ok: false, reason: "missing_announcement_digest_from_email" };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from: { email: from },
      subject: opts.subject,
      content: [{ type: "text/html", value: opts.html }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `sendgrid_${res.status}`, detail: body.slice(0, 500) };
  }
  return { ok: true };
}

/**
 * Daily digest: unread announcement titles per user.
 * When `User.digestPreference` exists (future migration), skip users with `off` / `none`.
 * @param {import("@prisma/client").PrismaClient} prisma
 */
export async function runAnnouncementDigestEmailJob(prisma) {
  if (process.env.ANNOUNCEMENT_DIGEST === "0") {
    return { skipped: true, reason: "disabled" };
  }
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const hasSendgrid = Boolean(process.env.SENDGRID_API_KEY);
  if (!hasResend && !hasSendgrid) {
    announcementLog("info", "announcement.digest_skipped", { reason: "no_email_provider" });
    return { skipped: true, reason: "no_email_provider" };
  }

  const baseUrl = String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || DEFAULT_DIGEST_BASE).replace(
    /\/+$/,
    "",
  );
  const maxUsers = Math.min(500, Math.max(1, Number(process.env.ANNOUNCEMENT_DIGEST_MAX_USERS) || 200));
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, email: true, full_name: true },
    take: maxUsers,
  });

  let sent = 0;
  let errors = 0;

  for (const u of users) {
    try {
      const loaded = await loadUserAnnouncementScope(prisma, u.id);
      if (!loaded) continue;
      const vu = visibilityUserFromLoaded(loaded);
      const unread = await getUnreadCount(prisma, vu);
      if (unread === 0) continue;
      const titles = await listUnreadAnnouncementTitles(prisma, u.id, vu);
      if (titles.length === 0) continue;

      const lines = titles
        .map((row) => `<li><a href="${baseUrl}/dashboard/announcements">${escapeHtml(row.title)}</a></li>`)
        .join("");
      const html = `<p>Hi ${escapeHtml(u.full_name || "there")},</p>
<p>You have <strong>${unread}</strong> unread announcement${unread === 1 ? "" : "s"}.</p>
<ul>${lines}</ul>
<p><a href="${baseUrl}/dashboard/announcements">Open announcements</a></p>`;

      const subject = unread === 1 ? "1 unread campus announcement" : `${unread} unread campus announcements`;
      const payload = { to: u.email, subject, html };
      const out = hasResend ? await sendViaResend(payload) : await sendViaSendGrid(payload);
      if (out.ok) sent += 1;
      else {
        errors += 1;
        announcementLog("warn", "announcement.digest_send_failed", { userId: u.id, ...out });
      }
    } catch (e) {
      errors += 1;
      announcementLog("warn", "announcement.digest_user_failed", { userId: u.id, message: e?.message ?? String(e) });
    }
  }

  announcementLog("info", "announcement.digest_tick", { sent, errors, scanned: users.length });
  return { sent, errors, scanned: users.length };
}
