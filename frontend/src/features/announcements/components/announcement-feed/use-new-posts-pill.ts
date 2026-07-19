'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Announcement } from '../../api/types';
import type { FeedTab } from './types';

export function useNewPostsPill(
  announcements: Announcement[],
  currentFilter: FeedTab
) {
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const feedTopRef = useRef<HTMLDivElement | null>(null);
  const previousIdsRef = useRef<Set<string | number>>(new Set());
  const [newPostsCount, setNewPostsCount] = useState(0);

  useEffect(() => {
    const currentIds = new Set(announcements.map((a) => a.id));
    if (currentFilter === 'drafts') {
      previousIdsRef.current = currentIds;
      return;
    }
    if (previousIdsRef.current.size === 0) {
      previousIdsRef.current = currentIds;
      return;
    }
    let added = 0;
    currentIds.forEach((id) => {
      if (!previousIdsRef.current.has(id)) added += 1;
    });
    previousIdsRef.current = currentIds;
    if (added > 0) {
      const el = feedScrollRef.current;
      const scrollTop = el?.scrollTop ?? (typeof window !== 'undefined' ? window.scrollY : 0);
      if (scrollTop > 160) setNewPostsCount((prev) => prev + added);
    }
  }, [announcements, currentFilter]);

  const handleScrollToTop = useCallback(() => {
    setNewPostsCount(0);
    const scroller = feedScrollRef.current;
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (feedTopRef.current) {
      feedTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return { feedScrollRef, feedTopRef, newPostsCount, handleScrollToTop };
}
