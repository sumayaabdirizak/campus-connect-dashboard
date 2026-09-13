'use client';

import type { RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import type { Announcement } from '@/lib/announcements/types';
import { AnnouncementEmpty } from '../empty';
import { AnnouncementError } from '../announcement-error';
import { AnnouncementListSkeleton } from '../skeleton';
import { FeedCardList } from './feed-card-list';
import type { FeedI18n } from './feed-i18n';
import type { FeedTab } from './types';

interface FeedBodyProps {
  i18n: FeedI18n;
  error: Error | null;
  onRetry: () => void;
  isLoading: boolean;
  visibleAnnouncements: Announcement[];
  filteredCount: number;
  contentFilterCount: number;
  currentFilter: FeedTab;
  onClearFilters: () => void;
  newPostsCount: number;
  onScrollToTop: () => void;
  feedScrollRef: RefObject<HTMLDivElement | null>;
  feedTopRef: RefObject<HTMLDivElement | null>;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  canManage: boolean;
  onEditAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (announcement: Announcement) => void;
  onTogglePinAnnouncement?: (announcement: Announcement) => void;
  onResumeDraft?: (id: number) => void | Promise<void>;
  onOpenAnalytics?: (announcement: Announcement) => void;
  onMarkAsRead?: (id: number) => Promise<unknown>;
  readTrigger?: 'viewport' | 'click';
  onSnapshotUnreadBeforeRead?: () => void;
  onReadDiagnostic?: (id: number) => void;
  onLightboxDiagnostic?: () => void;
  unreadAnnouncement: string;
}

export function FeedBody(props: FeedBodyProps) {
  const {
    i18n,
    error,
    onRetry,
    isLoading,
    visibleAnnouncements,
    filteredCount,
    contentFilterCount,
    currentFilter,
    onClearFilters,
    newPostsCount,
    onScrollToTop,
    feedScrollRef,
    feedTopRef,
    unreadAnnouncement
  } = props;

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div
        ref={feedScrollRef}
        // A ground with actual depth for the white cards to sit on. `bg-muted`
        // is not usable here: this theme sets --card #ffffff and --muted
        // #f8fafc, four luminance points apart, so a muted ground under white
        // cards is invisible. These two literals are a deliberate local
        // exception — both modes are specified, so they stay theme-correct.
        className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-slate-100 px-2 py-2 dark:bg-slate-950/60 [-webkit-overflow-scrolling:touch]'
      >
        {error ? (
          <div className='p-4'>
            <AnnouncementError error={error} onRetry={onRetry} />
          </div>
        ) : isLoading ? (
          <div className='p-4' role='status' aria-live='polite' aria-label={i18n.loadingLabel}>
            <AnnouncementListSkeleton />
          </div>
        ) : visibleAnnouncements.length > 0 ? (
          <>
            <div ref={feedTopRef} aria-hidden />
            {newPostsCount > 0 ? (
              <div className='sticky top-2 z-20 flex justify-center px-2 pt-2'>
                <button
                  type='button'
                  onClick={onScrollToTop}
                  className='inline-flex items-center gap-1.5 rounded-full bg-foreground/95 px-4 py-1.5 text-xs font-medium text-background shadow-lg backdrop-blur transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  aria-live='polite'
                >
                  <ArrowUp className='h-3.5 w-3.5' aria-hidden />
                  {i18n.newPostsPill(newPostsCount)}
                </button>
              </div>
            ) : null}
            <FeedCardList
              i18n={i18n}
              isLoading={isLoading}
              visibleAnnouncements={visibleAnnouncements}
              filteredCount={filteredCount}
              setVisibleCount={props.setVisibleCount}
              canManage={props.canManage}
              onEditAnnouncement={props.onEditAnnouncement}
              onDeleteAnnouncement={props.onDeleteAnnouncement}
              onTogglePinAnnouncement={props.onTogglePinAnnouncement}
              onResumeDraft={props.onResumeDraft}
              onOpenAnalytics={props.onOpenAnalytics}
              onMarkAsRead={props.onMarkAsRead}
              readTrigger={props.readTrigger}
              onSnapshotUnreadBeforeRead={props.onSnapshotUnreadBeforeRead}
              onReadDiagnostic={props.onReadDiagnostic}
              onLightboxDiagnostic={props.onLightboxDiagnostic}
            />
          </>
        ) : (
          <div className='p-4'>
            <AnnouncementEmpty
              hasFilters={contentFilterCount > 0}
              draftsTabEmpty={currentFilter === 'drafts' && contentFilterCount === 0}
              onClearFilters={onClearFilters}
            />
          </div>
        )}
      </div>
      <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
        {unreadAnnouncement}
      </div>
    </div>
  );
}
