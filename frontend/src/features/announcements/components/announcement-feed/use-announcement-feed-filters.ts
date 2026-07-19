'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBookmarks } from '../../utils/bookmark-store';
import { isAnnouncementTimelyPinned } from '../../utils/announcementPin';
import type { Announcement } from '../../api/types';
import { filterAndSortAnnouncements } from './filter-sort-announcements';
import type { DateFilter, FeedTab, ReadFilter, SortMode } from './types';
import { PAGE_SIZE } from './types';
import { useFeedUrlSync } from './use-feed-url-sync';

export function useAnnouncementFeedFilters(
  announcements: Announcement[],
  canManage: boolean
) {
  const searchParams = useSearchParams();
  const getParam = (key: string, fallback: string) =>
    searchParams?.get(key) ?? fallback;

  const [currentFilter, setCurrentFilter] = useState<FeedTab>(() => {
    const tab = getParam('tab', 'all');
    if (tab === 'pinned') return 'pinned';
    if (tab === 'saved') return 'saved';
    if (tab === 'drafts' && canManage) return 'drafts';
    return 'all';
  });
  const savedIds = useBookmarks();
  const [searchQuery, setSearchQuery] = useState(() => getParam('q', ''));
  const [roleFilter, setRoleFilter] = useState(() => getParam('role', 'ALL'));
  const [readFilter, setReadFilter] = useState<ReadFilter>(() => {
    const v = getParam('read', 'ALL');
    return v === 'READ' || v === 'UNREAD' ? v : 'ALL';
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
    const v = getParam('date', 'ALL');
    return v === '7D' || v === '30D' ? v : 'ALL';
  });
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const v = getParam('sort', 'NEWEST');
    return v === 'OLDEST' || v === 'PRIORITY' ? v : 'NEWEST';
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pinSortTick, setPinSortTick] = useState(0);

  useFeedUrlSync({
    currentFilter,
    searchQuery,
    roleFilter,
    readFilter,
    dateFilter,
    sortMode
  });

  useEffect(() => {
    if (announcements.length === 0) return;
    const id = window.setInterval(() => setPinSortTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, [announcements.length]);

  useEffect(() => {
    if (!canManage && currentFilter === 'drafts') setCurrentFilter('all');
  }, [canManage, currentFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [currentFilter]);

  const filteredAnnouncements = useMemo(
    () =>
      filterAndSortAnnouncements(announcements, {
        currentFilter,
        searchQuery,
        readFilter,
        dateFilter,
        sortMode,
        savedIds
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      announcements,
      currentFilter,
      searchQuery,
      readFilter,
      dateFilter,
      sortMode,
      pinSortTick,
      savedIds
    ]
  );

  const visibleAnnouncements = useMemo(
    () => filteredAnnouncements.slice(0, visibleCount),
    [filteredAnnouncements, visibleCount]
  );

  const pinnedCount = useMemo(
    () => announcements.filter((a) => isAnnouncementTimelyPinned(a)).length,
    [announcements, pinSortTick]
  );

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (roleFilter !== 'ALL' ? 1 : 0) +
    (readFilter !== 'ALL' ? 1 : 0) +
    (dateFilter !== 'ALL' ? 1 : 0) +
    (currentFilter !== 'all' ? 1 : 0) +
    (sortMode !== 'NEWEST' ? 1 : 0);

  const contentFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (roleFilter !== 'ALL' ? 1 : 0) +
    (readFilter !== 'ALL' ? 1 : 0) +
    (dateFilter !== 'ALL' ? 1 : 0) +
    (sortMode !== 'NEWEST' ? 1 : 0);

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setReadFilter('ALL');
    setDateFilter('ALL');
    setCurrentFilter('all');
    setSortMode('NEWEST');
  }, []);

  return {
    currentFilter,
    setCurrentFilter,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    readFilter,
    setReadFilter,
    dateFilter,
    setDateFilter,
    sortMode,
    setSortMode,
    visibleCount,
    setVisibleCount,
    filteredAnnouncements,
    visibleAnnouncements,
    pinnedCount,
    activeFilterCount,
    contentFilterCount,
    handleClearAllFilters
  };
}
