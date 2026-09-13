'use client';

import { useEffect, useRef } from 'react';
import { emitTypingStart, emitTypingStop } from '@/lib/discussions/queries/socket';

/**
 * Shared typing-indicator state machine for channel messages, thread replies,
 * and group DMs. Pass exactly one of `channelId` / `groupDmId` — whichever
 * the composer is posting into.
 */
export function useComposerTyping({
  channelId,
  groupDmId,
  parentMessageId,
}: {
  channelId?: string;
  groupDmId?: string;
  parentMessageId?: string;
}) {
  const lastStartEmittedAtRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const isTypingActiveRef = useRef(false);

  const emitArgs = channelId != null ? { channelId } : { groupDmId };

  const stopTyping = (force = false) => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (!isTypingActiveRef.current && !force) return;
    isTypingActiveRef.current = false;
    lastStartEmittedAtRef.current = 0;
    if (!parentMessageId) {
      emitTypingStop(emitArgs);
    }
  };

  const noteTypingActivity = () => {
    if (parentMessageId) return;
    const now = Date.now();
    if (now - lastStartEmittedAtRef.current > 3_000) {
      lastStartEmittedAtRef.current = now;
      isTypingActiveRef.current = true;
      emitTypingStart(emitArgs);
    }
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => stopTyping(), 5_000);
  };

  useEffect(() => {
    return () => stopTyping(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, groupDmId]);

  return { noteTypingActivity, stopTyping };
}
