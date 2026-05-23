'use client';

import { useEffect, useRef } from 'react';

type Handler = (event: KeyboardEvent) => void;
type HotkeyMap = Record<string, Handler>;

/// True when the user is currently typing in an editable surface. We don't
/// want `c` or `/` shortcuts to fire while someone is mid-sentence.
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  // Radix/Headless dropdowns: a focused listbox option should consume keys.
  if (target.getAttribute('role') === 'listbox') return true;
  return false;
}

/**
 * Lightweight global hotkey provider.
 *
 * Map shape: a key descriptor → handler. Modifier flags follow the
 * Notion/Linear convention: `mod+k` (cmd on macOS, ctrl elsewhere),
 * `shift+/`, etc. Bare keys (`Escape`, `c`, `/`) fire only when the user
 * is NOT in a text field — except `Escape`, which always fires so it can
 * close drawers.
 *
 * Re-binds on every render, so callers can supply closures that capture
 * the latest state without dependency-array gymnastics.
 */
export function useHotkeys(map: HotkeyMap, enabled = true): void {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const inEditor = isTextEntryTarget(e.target);
      const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      const parts: string[] = [];
      if (mod) parts.push('mod');
      if (e.shiftKey) parts.push('shift');
      if (e.altKey) parts.push('alt');
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      parts.push(key);
      const descriptor = parts.join('+');

      const handler = ref.current[descriptor];
      if (!handler) return;

      // Bare-key shortcuts get suppressed while the user is typing — except
      // Escape (always available to dismiss drawers/dialogs).
      if (!mod && !e.shiftKey && !e.altKey && key !== 'Escape' && inEditor) return;

      e.preventDefault();
      handler(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
