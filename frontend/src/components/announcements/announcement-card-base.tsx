'use client';

import { useMemo, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/features/ui/components/dropdown-menu';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { timeAgoLong } from '@/lib/format-time';
import { isAnnouncementTimelyPinned } from '@/lib/announcements/services/announcementPin';
import { AnnouncementHeader } from './announcement-header';
import { AnnouncementContent } from './announcement-content';
import { AnnouncementImages } from './announcement-images';
import { AnnouncementActions } from './announcement-actions';
import { AnnouncementExpiryRow } from './announcement-expiry-row';
import { PriorityBadge } from './announcement-priority-badge';
import { getAnnouncementContentI18n } from './announcement-content-helpers';
import type { AnnouncementCardProps } from './announcement-card-types';
import {
  useAnnouncementReadState,
  useAnnouncementViewportRead,
} from './use-announcement-read';

export function AnnouncementCardBase({
  announcement,
  onMarkAsRead,
  canManage = false,
  onEdit,
  onDelete,
  readTrigger = 'viewport',
  onSnapshotUnreadBeforeRead,
  onReadDiagnostic,
  onLightboxDiagnostic,
  onResumeDraft,
  onOpenAnalytics,
  posInSet,
  setSize
}: AnnouncementCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleId = `announcement-${announcement.id}-title`;
  const clickOpensDraft = String(announcement.status ?? '').toUpperCase() === 'DRAFT' && Boolean(onResumeDraft);
  const createdAt = announcement.createdAt || announcement.created_at || new Date().toISOString();
  const locale = useMemo(() => {
    if (typeof window === 'undefined') return 'en';
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }, []);
  const i18n = getAnnouncementContentI18n(locale);
  const showPriority =
    announcement.priority === 'urgent' || announcement.priority === 'important';
  const isPinned = isAnnouncementTimelyPinned(announcement);

  const { isRead, setIsRead, isDraftStatus, clickMarkReadActive, markRead } =
    useAnnouncementReadState({
      announcement,
      readTrigger,
      onMarkAsRead,
      onSnapshotUnreadBeforeRead,
      onReadDiagnostic,
    });

  useAnnouncementViewportRead({
    cardRef,
    announcement,
    readTrigger,
    isRead,
    isDraftStatus,
    onMarkAsRead,
    onSnapshotUnreadBeforeRead,
    onReadDiagnostic,
    setIsRead,
  });

  return (
    <article
      aria-labelledby={titleId}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      data-read={isRead ? 'true' : 'false'}
      data-priority={announcement.priority ?? 'normal'}
      tabIndex={clickOpensDraft || clickMarkReadActive ? 0 : undefined}
      className={cn(
        'mx-auto w-full max-w-xl',
        (clickMarkReadActive || clickOpensDraft) &&
          'cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      onClick={() => {
        if (clickOpensDraft) void onResumeDraft?.(Number(announcement.id));
        else void markRead();
      }}
      onKeyDown={
        clickOpensDraft || clickMarkReadActive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (clickOpensDraft) void onResumeDraft?.(Number(announcement.id));
                else void markRead();
              }
            }
          : undefined
      }
    >
      <div
        ref={cardRef}
        className='w-full rounded-xl border border-border bg-muted/50 p-3 shadow-sm transition-shadow duration-200 hover:shadow-md'
      >
        <div className='mb-2 flex items-start justify-between gap-2'>
          <AnnouncementHeader announcement={announcement} />
          <div className='flex shrink-0 items-center gap-1'>
            <p
              className='flex items-center gap-0.5 text-[10px] font-medium text-foreground/75'
              title={new Date(createdAt).toLocaleString()}
            >
              <Icons.clock className='h-3 w-3 shrink-0' aria-hidden />
              <time dateTime={createdAt}>{timeAgoLong(createdAt)}</time>
            </p>
            {canManage && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button
                    type='button'
                    aria-label='Announcement actions'
                    className='shrink-0 rounded-full p-0.5 text-foreground/60 transition-colors hover:bg-muted hover:text-foreground'
                  >
                    <Icons.ellipsis className='h-3 w-3' />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAnalytics?.(announcement);
                    }}
                  >
                    <Icons.barChart className='me-2 size-4' aria-hidden />
                    Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDraftStatus && onResumeDraft) void onResumeDraft(Number(announcement.id));
                      else onEdit?.(announcement);
                    }}
                  >
                    <Icons.edit className='me-2 size-4' aria-hidden />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='text-destructive focus:text-destructive'
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(announcement);
                    }}
                  >
                    <Icons.trash className='me-2 size-4' aria-hidden />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {(showPriority || isPinned) && (
          <div className='mb-2 flex items-center justify-between gap-2'>
            <div className='flex min-w-0 items-center gap-1.5'>
              {showPriority && <PriorityBadge priority={announcement.priority} />}
            </div>
            <div className='flex shrink-0 items-center gap-1.5'>
              {isPinned && (
                <span
                  className='inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-primary ring-1 ring-inset ring-primary/35'
                >
                  <Icons.pin className='size-2.5 shrink-0' aria-hidden />
                  {i18n.pinned}
                </span>
              )}
              <AnnouncementExpiryRow announcement={announcement} />
            </div>
          </div>
        )}
        {!showPriority && !isPinned && (
          <div className='mb-2 flex justify-end'>
            <AnnouncementExpiryRow announcement={announcement} />
          </div>
        )}
        <AnnouncementContent announcement={announcement} titleId={titleId} />
        <AnnouncementImages
          announcement={announcement}
          onLightboxDiagnostic={onLightboxDiagnostic}
        />

        {!isDraftStatus && (
          <>
            <div className='my-1.5 h-px bg-border' />
            <AnnouncementActions announcement={announcement} />
          </>
        )}

        {!isRead && (
          <p className='sr-only' aria-live='polite'>
            Unread announcement
          </p>
        )}
      </div>
    </article>
  );
}
