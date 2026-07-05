'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { differenceInCalendarDays, formatDistanceStrict } from 'date-fns';
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
import { Announcement } from '../api/types';
import { AnnouncementHeader } from './announcement-header';
import { AnnouncementContent } from './announcement-content';
import { AnnouncementImages } from './announcement-images';
import { AnnouncementActions } from './announcement-actions';
import { useAuthStore } from '@/lib/auth-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AnnouncementCardProps {
  announcement: Announcement;
  onMarkAsRead?: (id: number) => Promise<unknown>;
  canManage?: boolean;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
  onTogglePin?: (announcement: Announcement) => void;
  readTrigger?: 'viewport' | 'click';
  onSnapshotUnreadBeforeRead?: () => void;
  onReadDiagnostic?: (id: number) => void;
  onLightboxDiagnostic?: () => void;
  /** When set, draft rows refetch by id and open the composer instead of using list payload only. */
  onResumeDraft?: (id: number) => void | Promise<void>;
  onOpenAnalytics?: (announcement: Announcement) => void;
  /** ARIA Feed pattern (WAI-ARIA Authoring Practices): position within the visible feed. */
  posInSet?: number;
  /** ARIA Feed pattern: total visible items. */
  setSize?: number;
}

function priorityBarClass(priority: Announcement['priority'] | undefined) {
  switch (priority) {
    case 'urgent':
      return 'border-s-destructive/80 bg-gradient-to-r from-destructive/[0.04] to-transparent';
    case 'important':
      return 'border-s-amber-500/80 bg-gradient-to-r from-amber-500/[0.05] to-transparent dark:from-amber-500/10';
    default:
      return 'border-s-transparent';
  }
}

/**
 * WCAG 1.4.1 Use of Color: priority must be conveyed by something other than
 * color. Returns an icon-and-text badge so screen readers and color-blind users
 * receive equivalent information.
 */
function PriorityBadge({ priority }: { priority: Announcement['priority'] | undefined }) {
  if (priority !== 'urgent' && priority !== 'important') return null;
  const isUrgent = priority === 'urgent';
  const label = isUrgent ? 'Urgent' : 'Important';
  return (
    <span
      role='img'
      aria-label={`${label} priority`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset',
        isUrgent
          ? 'bg-destructive/10 text-destructive ring-destructive/20'
          : 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400'
      )}
    >
      {isUrgent ? (
        <Icons.warning className='size-3' aria-hidden />
      ) : (
        <Icons.info className='size-3' aria-hidden />
      )}
      {label}
    </span>
  );
}

function AnnouncementExpiryRow({
  announcement,
  canManage
}: {
  announcement: Announcement;
  canManage: boolean;
}) {
  const { user } = useAuthStore();
  const st = String(announcement.status ?? '').toUpperCase();

  const me = user?.id != null ? Number(user.id) : NaN;
  const creatorId = announcement.createdBy?.id != null ? Number(announcement.createdBy.id) : NaN;
  const isAuthor = Number.isFinite(me) && Number.isFinite(creatorId) && me === creatorId;
  const showPublisherPin = isAuthor || Boolean(canManage);

  if (st === 'EXPIRED' && showPublisherPin) {
    return (
      <div className='mb-2'>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role='img'
                aria-label='Expired announcement'
                tabIndex={0}
                className='inline-flex cursor-default items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'
              >
                <Icons.calendar className='size-3 opacity-70' aria-hidden />
                Expired
              </span>
            </TooltipTrigger>
            <TooltipContent side='top' className='max-w-xs text-xs leading-snug'>
              This announcement is no longer active. You still see it here so you can review or archive it.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  const expiresRaw = announcement.expiresAt;
  const pinUntil = expiresRaw ? new Date(expiresRaw) : null;
  if (!pinUntil || Number.isNaN(pinUntil.getTime())) return null;

  const now = Date.now();
  const isPublishedVisible = st === 'PUBLISHED' && announcement.isActive !== false;

  if (pinUntil.getTime() > now) {
    const days = differenceInCalendarDays(pinUntil, new Date());
    if (days > 60) return null;
    if (isPublishedVisible) {
      const distance = formatDistanceStrict(pinUntil, new Date(), { roundingMethod: 'ceil' });
      return (
        <p className='mb-2 text-[11px] text-muted-foreground'>
          <time dateTime={pinUntil.toISOString()}>Active · ends in {distance}</time>
        </p>
      );
    }
    if (showPublisherPin && st === 'DRAFT') {
      const distance = formatDistanceStrict(pinUntil, new Date(), { roundingMethod: 'ceil' });
      return (
        <p className='mb-2 text-[11px] text-muted-foreground'>
          <time dateTime={pinUntil.toISOString()}>Will be active · ends in {distance}</time>
        </p>
      );
    }
    return null;
  }

  return null;
}

function AnnouncementCardBase({
  announcement,
  onMarkAsRead,
  canManage = false,
  onEdit,
  onDelete,
  onTogglePin,
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
  const [isRead, setIsRead] = useState(Boolean(announcement.isRead));
  const titleId = `announcement-${announcement.id}-title`;
  const isDraftStatus = String(announcement.status ?? '').toUpperCase() === 'DRAFT';
  const clickOpensDraft = isDraftStatus && Boolean(onResumeDraft);
  const clickMarkReadActive = readTrigger === 'click' && !isRead && !isDraftStatus;

  useEffect(() => {
    setIsRead(Boolean(announcement.isRead));
  }, [announcement.id, announcement.isRead]);

  useEffect(() => {
    if (readTrigger !== 'viewport' || !cardRef.current) return;
    if (isDraftStatus) return;
    if (isRead || !onMarkAsRead) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        void (async () => {
          try {
            onSnapshotUnreadBeforeRead?.();
            await onMarkAsRead(Number(announcement.id));
            setIsRead(true);
            onReadDiagnostic?.(Number(announcement.id));
          } catch {
            // Non-blocking read marker.
          }
        })();
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [
    announcement.id,
    announcement.publishedAt,
    announcement.status,
    isRead,
    onMarkAsRead,
    onReadDiagnostic,
    onSnapshotUnreadBeforeRead,
    readTrigger,
    isDraftStatus
  ]);

  const onClickMarkRead = async () => {
    if (isDraftStatus) return;
    if (readTrigger !== 'click' || isRead || !onMarkAsRead) return;
    try {
      onSnapshotUnreadBeforeRead?.();
      await onMarkAsRead(Number(announcement.id));
      setIsRead(true);
      onReadDiagnostic?.(Number(announcement.id));
    } catch {
      // Non-blocking read marker.
    }
  };

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
        else void onClickMarkRead();
      }}
      onKeyDown={
        clickOpensDraft || clickMarkReadActive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (clickOpensDraft) void onResumeDraft?.(Number(announcement.id));
                else void onClickMarkRead();
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
                  {/* The manual Pin / Unpin item was removed: pinning is now
                      driven by the Active-days window set when creating or
                      editing the announcement. Once active days expire the
                      post auto-becomes a normal announcement. */}
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

export const AnnouncementCard = memo(AnnouncementCardBase);
