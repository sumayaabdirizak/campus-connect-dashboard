/* Minimal service worker for Web Push (Phase 2). */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Campus Connect", body: event.data?.text() || "New notification" };
  }
  const title = data.title || "Campus Connect";
  const options = {
    body: data.body || "",
    data: data.url ? { url: data.url } : {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/dashboard/announcements";
  event.waitUntil(self.clients.openWindow(url));
});
