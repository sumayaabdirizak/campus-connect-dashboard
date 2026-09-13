import { escapeHtml } from './transactionalEmail.service.js';

/**
 * Branded HTML for course activity emails (table layout for clients).
 * @param {{
 *   recipientName: string;
 *   courseLabel: string;
 *   courseName?: string;
 *   title: string;
 *   body: string;
 *   absoluteUrl: string;
 *   ctaLabel?: string;
 * }} opts
 */
export function buildCourseActivityEmailHtml(opts) {
  const name = escapeHtml(opts.recipientName || 'there');
  const course = escapeHtml(opts.courseLabel);
  const courseName = opts.courseName ? escapeHtml(opts.courseName) : '';
  const title = escapeHtml(opts.title);
  const body = escapeHtml(opts.body).replace(/\n/g, '<br />');
  const url = escapeHtml(opts.absoluteUrl);
  const cta = escapeHtml(opts.ctaLabel || 'Open in Campus Connect');
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${course}: ${title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background:#3B82F6;padding:20px 28px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Campus Connect</p>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Course update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151;">Hi ${name},</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#3B82F6;">${course}</p>
                    ${
                      courseName
                        ? `<p style="margin:0 0 12px;font-size:13px;color:#6B7280;">${courseName}</p>`
                        : ''
                    }
                    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;line-height:1.35;">${title}</p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:#4B5563;">${body}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;" align="center">
              <a href="${url}" style="display:inline-block;background:#3B82F6;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;mso-padding-alt:0;">
                <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:21pt;">&nbsp;</i><![endif]-->
                <span style="mso-text-raise:10pt;">${cta}</span>
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
                You received this because you are enrolled in ${course}.<br />
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
