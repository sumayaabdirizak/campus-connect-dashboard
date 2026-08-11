'use client';

import { useEffect, useRef } from 'react';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';

export function useThreadPanelScroll({
  threadRootId,
  root,
  repliesLength,
  hasMore,
  isLoadingOlder,
  loadOlder,
}: {
  threadRootId: string;
  root: DiscussionMessage | null;
  repliesLength: number;
  hasMore: boolean;
  isLoadingOlder: boolean;
  loadOlder: () => Promise<void>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);

  // Snap to bottom on first load
  useEffect(() => {
    if (initialScrollDoneRef.current) return;
    if (!root) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    initialScrollDoneRef.current = true;
  }, [root, repliesLength]);

  // Reset on thread change
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [threadRootId]);

  // Top sentinel triggers loadOlder for older replies
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const rootEl = scrollRef.current;
    if (!sentinel || !rootEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !isLoadingOlder) {
            void loadOlder();
          }
        }
      },
      { root: rootEl, rootMargin: '120px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingOlder, loadOlder]);

  return { scrollRef, sentinelRef };
}
