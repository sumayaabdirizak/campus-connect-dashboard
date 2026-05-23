// Campus Connect push service worker.
// Receives Web Push payloads from the backend and renders system notifications.
// Click on a notification focuses an existing tab on the target URL or opens a
// new one.

self.addEventListener('install', (event) => {
  // Roll out updates without forcing a page reload.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Campus Connect', body: event.data?.text() || 'New notification' };
  }
  const title = data.title || 'Campus Connect';
  const options = {
    body: data.body || '',
    tag: data.tag,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/dashboard' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/dashboard';
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });
      // Prefer focusing an existing tab pointed at (or close to) the target.
      for (const c of clientsList) {
        if (c.url.includes(targetUrl.split('?')[0]) && 'focus' in c) {
          await c.focus();
          if ('navigate' in c) c.navigate(targetUrl).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
