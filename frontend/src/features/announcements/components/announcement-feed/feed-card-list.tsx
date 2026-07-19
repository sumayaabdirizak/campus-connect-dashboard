'use client';

import type { Announcement } from '../../api/types';
import { AnnouncementCard } from '../announcement-card';
import type { FeedI18n } from './feed-i18n';
import { PAGE_SIZE } from './types';

interface FeedCardListProps {
  i18n: FeedI18n;
  isLoading: boolean;
  visibleAnnouncements: Announcement[];
  filteredCount: number;
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
}

export function FeedCardList({
  i18n,
  isLoading,
  visibleAnnouncements,
  filteredCount,
  setVisibleCount,
  canManage,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onTogglePinAnnouncement,
  onResumeDraft,
  onOpenAnalytics,
  onMarkAsRead,
  readTrigger,
  onSnapshotUnreadBeforeRead,
  onReadDiagnostic,
  onLightboxDiagnostic
}: FeedCardListProps) {
  return (
    <>
      <div
        role='feed'
        aria-busy={isLoading}
        aria-label={i18n.feedLabel}
        className='space-y-2 px-2 py-2 sm:px-3'
      >
        {visibleAnnouncements.map((announcement, index) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            canManage={canManage}
            onEdit={onEditAnnouncement}
            onDelete={onDeleteAnnouncement}
            onTogglePin={onTogglePinAnnouncement}
            onResumeDraft={onResumeDraft}
            onOpenAnalytics={onOpenAnalytics}
            onMarkAsRead={onMarkAsRead}
            readTrigger={readTrigger}
            onSnapshotUnreadBeforeRead={onSnapshotUnreadBeforeRead}
            onReadDiagnostic={onReadDiagnostic}
            onLightboxDiagnostic={onLightboxDiagnostic}
            posInSet={index + 1}
            setSize={visibleAnnouncements.length}
          />
        ))}
      </div>
      {visibleAnnouncements.length < filteredCount ? (
        <div className='border-t border-neutral-100 px-4 py-3 dark:border-neutral-800/80'>
          <button
            type='button'
            className='min-h-[44px] w-full rounded-full py-2.5 text-sm font-medium text-neutral-600 transition-colors duration-200 ease-out hover:bg-neutral-100/90 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            {i18n.showMore}
          </button>
        </div>
      ) : null}
    </>
  );
}
