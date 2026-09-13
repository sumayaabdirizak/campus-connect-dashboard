import nodemailer from 'nodemailer';

let transporter = null;

function getSmtpTransport() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
}

/**
 * Send via Nodemailer (e.g. Gmail SMTP + app password).
 * @param {{ to: string; subject: string; html: string }} opts
 */
export async function sendViaSmtp(opts) {
  const tx = getSmtpTransport();
  if (!tx) return { ok: false, reason: 'smtp_not_configured' };

  const from =
    process.env.SMTP_FROM ||
    process.env.ANNOUNCEMENT_DIGEST_FROM ||
    process.env.SMTP_USER;

  try {
    await tx.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: 'smtp_send_failed',
      detail: String(err?.message || err).slice(0, 300),
    };
  }
}
