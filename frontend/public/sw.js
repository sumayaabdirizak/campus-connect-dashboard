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

// ─── Quiz answer Background Sync ────────────────────────────────────────────
// Mirrors the IDB helpers in `quiz-offline-queue.ts`. When the page queues
// a payload while offline it also calls `registration.sync.register(...)`,
// and the browser fires this listener whenever connectivity returns —
// even if the student already closed the tab. We drain the queue here so
// the student's answers eventually reach the server without manual help.
//
// The DB schema (name / store / keyPath) must stay in lock-step with the
// page-side helper. If either side changes the schema, bump DB_VERSION and
// handle the migration in `onupgradeneeded` in BOTH places.
const QUIZ_DB_NAME = 'quiz-offline';
const QUIZ_STORE = 'pending-answers';

function openQuizDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUIZ_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUIZ_STORE)) {
        db.createObjectStore(QUIZ_STORE, { keyPath: 'attemptId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function drainQuizQueue() {
  const db = await openQuizDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(QUIZ_STORE, 'readonly');
    const req = tx.objectStore(QUIZ_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(item.csrf ? { 'X-CSRF-Token': item.csrf } : {})
        },
        body: JSON.stringify(item.body)
      });
      // 2xx = saved. 4xx = attempt already finalized server-side, drop it
      // so we don't retry forever. 5xx = transient, leave for the next
      // sync wake-up to retry.
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(QUIZ_STORE, 'readwrite');
          tx.objectStore(QUIZ_STORE).delete(item.attemptId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        // Tell any open tabs we made progress so they can refresh their pill.
        const clients = await self.clients.matchAll();
        for (const c of clients) {
          c.postMessage({ type: 'quiz-sync-progress', attemptId: item.attemptId });
        }
      } else {
        // 5xx — throw so Background Sync retries with exponential backoff.
        throw new Error(`drain http ${res.status}`);
      }
    } catch (e) {
      // Bail on first failure; the sync will be re-tried by the platform.
      db.close();
      throw e;
    }
  }
  db.close();
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'quiz-answers-sync') {
    event.waitUntil(drainQuizQueue());
  }
});
