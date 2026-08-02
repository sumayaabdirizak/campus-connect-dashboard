import { escapeHtml } from './transactionalEmail.service.js';

/**
 * Branded HTML for "you have a new message" emails — sent only when the
 * recipient is offline or was @mentioned, never for every message.
 * @param {{
 *   recipientName: string;
 *   conversationLabel: string;
 *   senderName: string;
 *   snippet: string;
 *   absoluteUrl: string;
 *   mentioned?: boolean;
 * }} opts
 */
export function buildMessageEmailHtml(opts) {
  const name = escapeHtml(opts.recipientName || 'there');
  const conversation = escapeHtml(opts.conversationLabel);
  const sender = escapeHtml(opts.senderName);
  const snippet = escapeHtml(opts.snippet).replace(/\n/g, '<br />');
  const url = escapeHtml(opts.absoluteUrl);
  const subtitle = opts.mentioned ? 'You were mentioned' : 'New message';
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${conversation}: ${subtitle}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background:#3B82F6;padding:20px 28px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Campus Connect</p>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.85);">${subtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151;">Hi ${name},</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#3B82F6;">${conversation}</p>
                    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">${sender}</p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:#4B5563;">${snippet}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;" align="center">
              <a href="${url}" style="display:inline-block;background:#3B82F6;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;mso-padding-alt:0;">
                <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:21pt;">&nbsp;</i><![endif]-->
                <span style="mso-text-raise:10pt;">Open conversation</span>
                <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;">&nbsp;</i><![endif]-->
              </a>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9CA3AF;">
                Or paste this link:<br />
                <a href="${url}" style="color:#3B82F6;word-break:break-all;">${url}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#9CA3AF;text-align:center;">
                ${opts.mentioned ? 'You were mentioned in this conversation.' : 'Sent because you were offline when this arrived.'}<br />
                © ${year} Campus Connect
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
