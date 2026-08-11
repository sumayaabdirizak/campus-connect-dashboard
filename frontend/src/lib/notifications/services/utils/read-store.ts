'use client';

import { useSyncExternalStore } from 'react';

/**
 * Client-side read-state for the notification feed.
 *
 * Announcements and deadlines are *derived* (no server read column), so their
 * read state lives here in localStorage, keyed by the item's stable `key`.
 * Discussion notifications carry their own server `readAt` and are also folded
 * in here so a single unread count / "mark all" works across every source.
 *
 * Module-level so the bell and the page share one store; changes broadcast via
 * useSyncExternalStore.
 */

const LS_KEY = 'cc.notif.read.v1';

let readSet: Set<string> = loadInitial();
const listeners = new Set<() => void>();

function loadInitial(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify([...readSet]));
  } catch {
    /* quota / private mode — read state is best-effort */
  }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const EMPTY: Set<string> = new Set();
function getSnapshot() {
  return readSet;
}
function getServerSnapshot() {
  return EMPTY;
}

/** Mark one or more item keys as read (idempotent; broadcasts on change). */
export function markKeysRead(keys: string[]) {
  let changed = false;
  for (const k of keys) {
    if (!readSet.has(k)) {
      readSet.add(k);
      changed = true;
    }
  }
  if (changed) {
    // New identity so getSnapshot returns a changed reference.
    readSet = new Set(readSet);
    persist();
    emit();
  }
}

/** Subscribe to the read-key set. */
export function useReadKeys(): Set<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
