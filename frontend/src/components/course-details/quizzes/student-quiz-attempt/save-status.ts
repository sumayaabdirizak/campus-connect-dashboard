'use client';

import { Check, CloudOff, Loader2 } from 'lucide-react';

export function getSaveStatus(opts: {
  isOffline: boolean;
  queuedCount: number;
  savePending: boolean;
  saveErrored: boolean;
  lastSavedAt: number | null;
}) {
  const { isOffline, queuedCount, savePending, saveErrored, lastSavedAt } = opts;
  if (isOffline) {
    return {
      icon: CloudOff,
      text:
        queuedCount > 0
          ? `Offline · ${queuedCount} change${queuedCount === 1 ? '' : 's'} queued`
          : 'Offline · changes will sync',
      tone: 'text-warning',
      spin: false
    };
  }
  if (queuedCount > 0) {
    return {
      icon: Loader2,
      text: `Syncing ${queuedCount} queued change${queuedCount === 1 ? '' : 's'}…`,
      tone: 'text-muted-foreground',
      spin: true
    };
  }
  if (savePending) {
    return { icon: Loader2, text: 'Saving…', tone: 'text-muted-foreground', spin: true };
  }
  if (saveErrored) {
    return {
      icon: CloudOff,
      text: "Couldn't save — will retry",
      tone: 'text-destructive',
      spin: false
    };
  }
  if (lastSavedAt != null) {
    const secs = Math.max(1, Math.floor((Date.now() - lastSavedAt) / 1000));
    return {
      icon: Check,
      text: secs < 5 ? 'Saved' : `Saved ${secs}s ago`,
      tone: 'text-success',
      spin: false
    };
  }
  return null;
}
