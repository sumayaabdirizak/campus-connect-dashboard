import { prisma } from "../../../../db/prisma.js";
import { buildMessageEmailHtml } from "../../../../services/messageEmailTemplate.js";
import { sendTransactionalEmail } from "../../../../services/transactionalEmail.service.js";

const APP_BASE = () =>
  String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );

function snippetFrom(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240) || "New message";
}

/**
 * Email only the recipients who are offline right now, plus anyone
 * @mentioned regardless of online status. Never fires for a plain message to
 * an online, non-mentioned recipient — that's covered by the in-app/socket
 * notification already. Best-effort, fire-and-forget: never throws.
 *
 * @param {{
 *   memberUserIds: number[];
 *   offlineIds: number[];
 *   mentionUserIds: number[];
 *   senderName: string;
 *   conversationLabel: string;
 *   plaintext: string;
 *   href: string;
 * }} opts
 */
export async function notifyOfflineOrMentionedByEmail(opts) {
  try {
    const mentionSet = new Set(opts.mentionUserIds ?? []);
    const offlineSet = new Set(opts.offlineIds ?? []);
    const recipientIds = [...new Set([...offlineSet, ...mentionSet])].filter((id) =>
      (opts.memberUserIds ?? []).includes(id),
    );
    if (recipientIds.length === 0) return;

    const recipients = await prisma.user.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true, email: true, full_name: true },
    });
    if (recipients.length === 0) return;

    const snippet = snippetFrom(opts.plaintext);
    const absoluteUrl = `${APP_BASE()}${opts.href.startsWith("/") ? opts.href : `/${opts.href}`}`;

    await Promise.all(
      recipients.map(async (r) => {
        if (!r.email) return;
        const mentioned = mentionSet.has(Number(r.id));
        const html = buildMessageEmailHtml({
          recipientName: r.full_name || "there",
          conversationLabel: opts.conversationLabel,
          senderName: opts.senderName,
          snippet,
          absoluteUrl,
          mentioned,
        });
        await sendTransactionalEmail({
          to: r.email,
          subject: mentioned
            ? `${opts.senderName} mentioned you in ${opts.conversationLabel}`
            : `New message in ${opts.conversationLabel}`,
          html,
        }).catch(() => {});
      }),
    );
  } catch {
    // Best-effort — never let email delivery break message sending.
  }
}
