/**
 * Best-effort transactional email.
 * Prefer Nodemailer SMTP when configured; else Resend / SendGrid.
 */
import { sendViaSmtp } from './transactionalEmail.smtp.js';

/**
 * @param {{ to: string; subject: string; html: string }} opts
 * @returns {Promise<{ ok: boolean; reason?: string; detail?: string }>}
 */
export async function sendTransactionalEmail(opts) {
  const smtp = await sendViaSmtp(opts);
  if (smtp.ok || smtp.reason !== 'smtp_not_configured') return smtp;

  if (process.env.RESEND_API_KEY) {
    const from =
      process.env.ANNOUNCEMENT_DIGEST_FROM || 'Campus <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) return { ok: false, reason: `resend_${res.status}` };
    return { ok: true };
  }

  if (process.env.SENDGRID_API_KEY) {
    const from = process.env.ANNOUNCEMENT_DIGEST_FROM_EMAIL;
    if (!from) return { ok: false, reason: 'missing_from_email' };
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: from },
        subject: opts.subject,
        content: [{ type: 'text/html', value: opts.html }],
      }),
    });
    if (!res.ok) return { ok: false, reason: `sendgrid_${res.status}` };
    return { ok: true };
  }

  return { ok: false, reason: 'no_email_provider' };
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
