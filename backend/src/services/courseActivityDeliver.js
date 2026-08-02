import { buildCourseActivityEmailHtml } from './courseActivityEmailTemplate.js';
import { sendTransactionalEmail } from './transactionalEmail.service.js';

const APP_BASE = () =>
  String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(
    /\/+$/,
    ''
  );

/**
 * Email enrolled recipients for a course activity (best-effort).
 * @param {{
 *   students: Array<{ email?: string | null; full_name?: string | null }>;
 *   courseLabel: string;
 *   courseName?: string;
 *   title: string;
 *   body: string;
 *   href: string;
 *   ctaLabel: string;
 *   tag?: string;
 * }} opts
 */
export async function deliverCourseActivity(opts) {
  const absoluteUrl = `${APP_BASE()}${opts.href}`;
  await Promise.all(
    opts.students.map(async (s) => {
      if (!s.email) return;
      const html = buildCourseActivityEmailHtml({
        recipientName: s.full_name || 'there',
        courseLabel: opts.courseLabel,
        courseName: opts.courseName,
        title: opts.title,
        body: opts.body,
        absoluteUrl,
        ctaLabel: opts.ctaLabel,
      });
      await sendTransactionalEmail({
        to: s.email,
        subject: `${opts.courseLabel}: ${opts.title}`,
        html,
      }).catch(() => {});
    })
  );
}
