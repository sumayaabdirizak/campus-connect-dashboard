'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AnnouncementHeader } from './announcement-header';
import { AnnouncementContent } from './announcement-content';
import { AnnouncementImages } from './announcement-images';
import { AnnouncementActions } from './announcement-actions';
import { AnnouncementExpiryRow } from './announcement-expiry-row';
import { PriorityBadge } from './announcement-priority-badge';
import type { AnnouncementCardProps } from './announcement-card-types';
import { priorityBarClass } from './announcement-card-types';
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
  const cardRef = useRef<HTMLElement | null>(null);
  const titleId = `announcement-${announcement.id}-title`;
  const clickOpensDraft = String(announcement.status ?? '').toUpperCase() === 'DRAFT' && Boolean(onResumeDraft);

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
      ref={cardRef}
      aria-labelledby={titleId}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      data-read={isRead ? 'true' : 'false'}
      data-priority={announcement.priority ?? 'normal'}
      tabIndex={clickOpensDraft || clickMarkReadActive ? 0 : undefined}
      className={cn(
        'w-full',
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
      <Card
        className={cn(
          'group/card relative gap-0 overflow-hidden rounded-2xl border-border/60 py-0 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-all duration-200',
          'hover:-translate-y-px hover:border-border/80 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)]',
          'border-s-[3px]',
          priorityBarClass(announcement.priority),
          !isRead && 'bg-primary/[0.012] ring-1 ring-primary/10'
        )}
      >
        <CardContent className='space-y-3 p-4 sm:p-5'>
          <header className='flex items-start justify-between gap-2'>
            <AnnouncementHeader announcement={announcement} />
            {canManage && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-11 shrink-0 rounded-full sm:size-9'
                    aria-label='Announcement actions'
                  >
                    <Icons.moreHorizontal className='size-4' aria-hidden />
                  </Button>
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
          </header>
          <div className='ps-[44px] sm:ps-[46px]'>
            {(announcement.priority === 'urgent' || announcement.priority === 'important') && (
              <div className='mb-2'>
                <PriorityBadge priority={announcement.priority} />
              </div>
            )}
            <AnnouncementExpiryRow announcement={announcement} canManage={Boolean(canManage)} />
            <AnnouncementContent
              announcement={announcement}
              showTargetingDetails={canManage}
              titleId={titleId}
            />
            <AnnouncementImages
              announcement={announcement}
              onLightboxDiagnostic={onLightboxDiagnostic}
            />
          </div>
          {!isDraftStatus && <AnnouncementActions announcement={announcement} />}
          {!isRead && (
            <p className='sr-only' aria-live='polite'>
              Unread announcement
            </p>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
