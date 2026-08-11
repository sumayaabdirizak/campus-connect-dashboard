'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getFeedI18n } from './feed-i18n';
import { FeedAside } from './feed-aside';
import { FeedBody } from './feed-body';
import { FeedHeader } from './feed-header';
import type { AnnouncementFeedProps } from './types';
import { useAnnouncementFeedFilters } from './use-announcement-feed-filters';
import { useNewPostsPill } from './use-new-posts-pill';

export function AnnouncementFeed({
  announcements,
  isLoading,
  error,
  onRetry,
  userRole,
  unreadCount,
  draftCount = 0,
  canManage = false,
  canCreate = false,
  onOpenCreate,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onTogglePinAnnouncement,
  onMarkAsRead,
  onResumeDraft,
  onOpenAnalytics,
  readTrigger = 'viewport',
  onSnapshotUnreadBeforeRead,
  onReadDiagnostic,
  onLightboxDiagnostic
}: AnnouncementFeedProps) {
  const locale = useMemo(() => {
    if (typeof window === 'undefined') return 'en' as const;
    return navigator.language?.toLowerCase().startsWith('ar') ? ('ar' as const) : ('en' as const);
  }, []);
  const i18n = getFeedI18n(locale);

  const filters = useAnnouncementFeedFilters(announcements, canManage);
  const newPosts = useNewPostsPill(announcements, filters.currentFilter);

  const previousUnreadRef = useRef(unreadCount);
  const [unreadAnnouncement, setUnreadAnnouncement] = useState('');
  useEffect(() => {
    if (previousUnreadRef.current !== unreadCount) {
      previousUnreadRef.current = unreadCount;
      setUnreadAnnouncement(i18n.unreadAnnounce(unreadCount));
    }
  }, [unreadCount, i18n]);

  return (
    <div className='mx-auto flex h-full min-h-0 w-full max-w-[100vw] min-w-0 flex-1 flex-col gap-6 overflow-x-hidden px-0 sm:px-4 lg:flex-row lg:items-stretch lg:gap-8'>
      <div className='mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-3xl border border-border/60 bg-background/90 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]'>
        <FeedHeader
          i18n={i18n}
          canCreate={canCreate}
          canManage={canManage}
          draftCount={draftCount}
          onOpenCreate={onOpenCreate}
          userRole={userRole}
          currentFilter={filters.currentFilter}
          setCurrentFilter={filters.setCurrentFilter}
          searchQuery={filters.searchQuery}
          setSearchQuery={filters.setSearchQuery}
          readFilter={filters.readFilter}
          setReadFilter={filters.setReadFilter}
          dateFilter={filters.dateFilter}
          setDateFilter={filters.setDateFilter}
          roleFilter={filters.roleFilter}
          setRoleFilter={filters.setRoleFilter}
          sortMode={filters.sortMode}
          setSortMode={filters.setSortMode}
          activeFilterCount={filters.activeFilterCount}
          onClearAll={filters.handleClearAllFilters}
        />
        <FeedBody
          i18n={i18n}
          error={error}
          onRetry={onRetry}
          isLoading={isLoading}
          visibleAnnouncements={filters.visibleAnnouncements}
          filteredCount={filters.filteredAnnouncements.length}
          contentFilterCount={filters.contentFilterCount}
          currentFilter={filters.currentFilter}
          onClearFilters={filters.handleClearAllFilters}
          newPostsCount={newPosts.newPostsCount}
          onScrollToTop={newPosts.handleScrollToTop}
          feedScrollRef={newPosts.feedScrollRef}
          feedTopRef={newPosts.feedTopRef}
          setVisibleCount={filters.setVisibleCount}
          canManage={canManage}
          onEditAnnouncement={onEditAnnouncement}
          onDeleteAnnouncement={onDeleteAnnouncement}
          onTogglePinAnnouncement={onTogglePinAnnouncement}
          onResumeDraft={onResumeDraft}
          onOpenAnalytics={onOpenAnalytics}
          onMarkAsRead={onMarkAsRead}
          readTrigger={readTrigger}
          onSnapshotUnreadBeforeRead={onSnapshotUnreadBeforeRead}
          onReadDiagnostic={onReadDiagnostic}
          onLightboxDiagnostic={onLightboxDiagnostic}
          unreadAnnouncement={unreadAnnouncement}
        />
      </div>
      <FeedAside
        i18n={i18n}
        unreadCount={unreadCount}
        pinnedCount={filters.pinnedCount}
      />
    </div>
  );
}
