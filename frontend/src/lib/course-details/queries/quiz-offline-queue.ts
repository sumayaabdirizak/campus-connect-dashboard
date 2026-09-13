'use client';

/// IndexedDB-backed queue of pending quiz-answer autosaves that couldn't
/// reach the server (offline, network blip, server 5xx). The page replays
/// the queue when it sees the `online` event; the service worker also
/// replays it on Background Sync wake-ups so the answers eventually land
/// even if the student closes the tab while offline.
///
/// Why IDB and not localStorage:
///   - localStorage is sync and string-only (slow + JSON.stringify everything)
///   - IDB handles structured data, larger payloads, transactional writes
///   - SW can read IDB; SW cannot read localStorage
///
/// Why one queue per attempt id and not a single global queue:
///   - simpler retention: when an attempt finalizes we can drop its bucket
///   - clearer debugging in DevTools
///
/// We coalesce: the queue only ever holds the LATEST payload per attempt.
/// An offline student typing for 30s shouldn't generate 30 queued entries —
/// only the most recent answers matter at flush time.

const DB_NAME = 'quiz-offline';
const STORE = 'pending-answers';
const DB_VERSION = 1;

export interface PendingPayload {
  /// Primary key — one row per attempt at any time.
  attemptId: number;
  /// CSRF token to include when the SW replays. Cached at queue-time so a
  /// rotated cookie post-queue doesn't invalidate the replay. (The backend
  /// re-validates against the live cookie anyway — this is best-effort.)
  csrf: string;
  /// The exact request body we'd have sent.
  body: { answers: Array<{ questionId: number; selected_option_id?: number | null; text_answer?: string | null }> };
  /// Server endpoint, captured so the SW doesn't need to re-derive the API base.
  url: string;
  /// When this payload was queued — used for "queued 12s ago" UI hints.
  queuedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'attemptId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Upsert (or replace) the queued payload for this attempt. Coalescing
 * means we never accumulate more than one row per attempt.
 */
export async function enqueueAnswers(payload: PendingPayload): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Read every pending payload. Used by both the page-side drain (on
 * `online`) and the SW-side drain (on `sync`).
 */
export async function getAllPending(): Promise<PendingPayload[]> {
  const db = await openDb();
  const rows = await new Promise<PendingPayload[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingPayload[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

/**
 * Remove a single attempt's queued payload after a successful replay.
 */
export async function removeAttempt(attemptId: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(attemptId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Try to drain the queue once. Returns counts so the caller can render
 * "X synced, Y still pending". Stops at the first transient failure so
 * we don't hammer a struggling network — the next online event (or SW
 * sync wake-up) picks it back up.
 */
export async function drainPending(): Promise<{ ok: number; failed: number }> {
  const items = await getAllPending();
  let ok = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(item.csrf ? { 'X-CSRF-Token': item.csrf } : {}),
        },
        body: JSON.stringify(item.body),
      });
      if (res.ok) {
        await removeAttempt(item.attemptId);
        ok += 1;
      } else if (res.status >= 400 && res.status < 500) {
        // Permanent failure (4xx) — most commonly the attempt was already
        // finalized server-side, so the autosave is moot. Drop the row so
        // we don't retry forever.
        await removeAttempt(item.attemptId);
        ok += 1;
      } else {
        failed += 1;
        break;
      }
    } catch {
      failed += 1;
      break; // network still down; bail
    }
  }
  return { ok, failed };
}

/**
 * Register the Background Sync tag with the service worker so the SW
 * retries when the device next has connectivity — even if the student
 * has closed the tab. No-op on browsers without the API (Safari).
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    type SyncManager = { register: (tag: string) => Promise<void> };
    const sync = (reg as ServiceWorkerRegistration & { sync?: SyncManager }).sync;
    if (!sync) return false;
    await sync.register('quiz-answers-sync');
    return true;
  } catch {
    return false;
  }
}
