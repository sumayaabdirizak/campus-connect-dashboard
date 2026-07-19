'use client';

import { useEffect, useRef } from 'react';
import { emitTypingStart, emitTypingStop } from '../../../api/socket';

export function useComposerTyping(channelId: number, parentMessageId?: number) {
  const lastStartEmittedAtRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const isTypingActiveRef = useRef(false);

  const stopTyping = (force = false) => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (!isTypingActiveRef.current && !force) return;
    isTypingActiveRef.current = false;
    lastStartEmittedAtRef.current = 0;
    if (!parentMessageId) {
      emitTypingStop({ channelId });
    }
  };

  const noteTypingActivity = () => {
    if (parentMessageId) return;
    const now = Date.now();
    if (now - lastStartEmittedAtRef.current > 3_000) {
      lastStartEmittedAtRef.current = now;
      isTypingActiveRef.current = true;
      emitTypingStart({ channelId });
    }
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => stopTyping(), 5_000);
  };

  useEffect(() => {
    return () => stopTyping(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  return { noteTypingActivity, stopTyping };
}
