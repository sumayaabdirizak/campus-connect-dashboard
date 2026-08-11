'use client';

import { useEffect, useRef } from 'react';
import { emitTypingStart, emitTypingStop } from '@/lib/discussions/queries/socket';

/** Emit typing start/stop for an office thread composer. */
export function useOfficeComposerTyping(officeThreadId: number | null | undefined) {
  const lastStartEmittedAtRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const isTypingActiveRef = useRef(false);
  const tid = Number(officeThreadId);
  const enabled = Number.isFinite(tid) && tid > 0;

  const stopTyping = (force = false) => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (!isTypingActiveRef.current && !force) return;
    isTypingActiveRef.current = false;
    lastStartEmittedAtRef.current = 0;
    if (enabled) emitTypingStop({ officeThreadId: tid });
  };

  const noteTypingActivity = () => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastStartEmittedAtRef.current > 3_000) {
      lastStartEmittedAtRef.current = now;
      isTypingActiveRef.current = true;
      emitTypingStart({ officeThreadId: tid });
    }
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => stopTyping(), 5_000);
  };

  useEffect(() => {
    return () => stopTyping(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid]);

  return { noteTypingActivity, stopTyping };
}
