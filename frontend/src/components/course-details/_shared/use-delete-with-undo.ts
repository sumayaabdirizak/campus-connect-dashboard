'use client';

import { useCallback, useRef } from 'react';
import { showToast } from '@/lib/notifications';
import { toast } from 'sonner';

interface DeleteWithUndoOptions {
  /// User-visible label for the toast ("Post deleted", "Message deleted", …).
  label: string;
  /// Run immediately to hide the item from the UI. Return whatever undo state
  /// you'll need to put it back.
  optimisticallyRemove: () => void;
  /// Put the item back. Called when the user clicks Undo or the server rejects.
  restore: () => void;
  /// Called once the grace period expires with no undo — should send the
  /// real DELETE request. Throwing or rejecting triggers `restore()`.
  commit: () => Promise<unknown>;
  /// Grace period in ms. 5s is standard; agents may want shorter.
  delayMs?: number;
}

/**
 * The Linear / Notion / Vercel-Dashboard delete pattern.
 *
 *   1. Hide the row from the UI immediately (optimistic)
 *   2. Show a toast with an Undo button for `delayMs`
 *   3a. If user clicks Undo → put the row back, never call the server
 *   3b. If the timer expires → fire the real DELETE; rollback if it fails
 *
 * Returns a stable `run()` function plus a `cancelAll()` cleanup if the
 * component unmounts while a deletion is still pending.
 */
export function useDeleteWithUndo() {
  const pending = useRef(new Map<string, number>());

  const cancelAll = useCallback(() => {
    for (const [, id] of pending.current) window.clearTimeout(id);
    pending.current.clear();
  }, []);

  const run = useCallback(
    ({
      label,
      optimisticallyRemove,
      restore,
      commit,
      delayMs = 5000
    }: DeleteWithUndoOptions) => {
      const key = crypto.randomUUID();
      optimisticallyRemove();

      const timer = window.setTimeout(async () => {
        pending.current.delete(key);
        try {
          await commit();
        } catch (e) {
          // Server rejected — restore and surface the error.
          restore();
          const msg = e instanceof Error ? e.message : 'Delete failed';
          showToast('error', `Couldn't delete · ${msg}`);
        }
      }, delayMs);
      pending.current.set(key, timer);

      toast(label, {
        duration: delayMs,
        action: {
          label: 'Undo',
          onClick: () => {
            const t = pending.current.get(key);
            if (t != null) {
              window.clearTimeout(t);
              pending.current.delete(key);
            }
            restore();
          }
        }
      });
    },
    []
  );

  return { run, cancelAll };
}
