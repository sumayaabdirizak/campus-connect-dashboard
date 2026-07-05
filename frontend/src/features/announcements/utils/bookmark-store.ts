'use client';

import { useSyncExternalStore } from 'react';

/**
 * Client-side "saved" announcements. There's no server bookmark table yet, so
 * saves live in localStorage keyed by announcement id, shared across the feed
 * and the card via a module-level store.
 */

const LS_KEY = 'cc.announcements.saved.v1';

let saved: Set<string> = loadInitial();
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
    window.localStorage.setItem(LS_KEY, JSON.stringify([...saved]));
  } catch {
    /* best-effort */
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
const getSnapshot = () => saved;
const getServerSnapshot = () => EMPTY;

/** Toggle saved state for an announcement id. */
export function toggleBookmark(id: string | number) {
  const key = String(id);
  const next = new Set(saved);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  saved = next;
  persist();
  emit();
}

/** Subscribe to the set of saved announcement ids. */
export function useBookmarks(): Set<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
