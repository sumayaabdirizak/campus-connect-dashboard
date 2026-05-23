import webpush from 'web-push';
import { prisma } from '../db/prisma.js';

let configured = false;
function configureWebPush() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@localhost';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Send a Web Push notification to every subscription owned by `userId`.
 * Silently no-ops when VAPID keys are missing or the user has no subscriptions
 * — push is best-effort, never blocking the originating action.
 *
 * @param {number} userId
 * @param {{ title: string; body: string; url?: string; tag?: string }} payload
 */
export async function pushToUser(userId, payload) {
  if (!configureWebPush()) return;
  const subs = await prisma.webPushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    tag: payload.tag,
  });

  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        )
        .catch(async (err) => {
          // 404/410: subscription expired or unsubscribed — clean up so we
          // don't keep hammering dead endpoints.
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await prisma.webPushSubscription
              .deleteMany({ where: { endpoint: s.endpoint } })
              .catch(() => {});
          }
        })
    )
  );
}

/** Convenience: push to several users in parallel. */
export async function pushToUsers(userIds, payload) {
  await Promise.all([...new Set(userIds)].map((id) => pushToUser(id, payload)));
}
