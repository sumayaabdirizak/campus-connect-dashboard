'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { differenceInCalendarDays, formatDistanceStrict } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AnnouncementCardProps {
  announcement: Announcement;
  onMarkAsRead?: (id: number) => Promise<unknown>;
  canManage?: boolean;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
  onTogglePin?: (announcement: Announcement) => void;
  /** Moves a future scheduled post back to draft (clears publish time). */
  onCancelSchedule?: (announcement: Announcement) => void | Promise<void>;
  /** PATCH `publishedAt` from the quick reschedule modal. */
  onReschedulePublishAt?: (announcement: Announcement, publishedAtIso: string) => void | Promise<void>;
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

function isScheduledFuture(a: Announcement) {
  if (String(a.status ?? '').toUpperCase() !== 'SCHEDULED') return false;
  const t = a.publishedAt ? new Date(a.publishedAt).getTime() : NaN;
  return Number.isFinite(t) && t > Date.now();
}

function isScheduledStatus(a: Announcement) {
  return String(a.status ?? '').toUpperCase() === 'SCHEDULED';
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minPublishDatetimeLocal(): string {
  const d = new Date(Date.now() + 3 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * WCAG 1.4.1: scheduled state is not conveyed by color alone — calendar icon + text badge,
 * plus an explicit "Publishes at" line and machine-readable `<time>`.
 * Datetime uses `navigator.language` with `Intl`, matching locale-aware formatting in this feature.
 */
function ScheduledStatusRow({ announcement }: { announcement: Announcement }) {
  const locale = useMemo(() => {
    if (typeof window === 'undefined') return 'en';
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }, []);
  const isRtl = locale === 'ar';
  const labels =
    locale === 'ar'
      ? {
          badge: 'مجدول',
          badgeAria: 'إعلان مجدول',
          publishesAt: 'ينشر في',
          wasScheduledFor: 'كان مجدولًا في',
          noTime: 'لم يُحدد وقت النشر'
        }
      : {
          badge: 'Scheduled',
          badgeAria: 'Scheduled announcement',
          publishesAt: 'Publishes at',
          wasScheduledFor: 'Was scheduled for',
          noTime: 'Publish time not set'
        };

  const raw = announcement.publishedAt;
  const formatted = useMemo(() => {
    if (raw == null || raw === '') return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat(
      typeof navigator !== 'undefined' ? navigator.language : undefined,
      { dateStyle: 'medium', timeStyle: 'short' }
    ).format(d);
  }, [raw]);

  const isFuture =
    raw != null &&
    raw !== '' &&
    !Number.isNaN(new Date(raw).getTime()) &&
    new Date(raw).getTime() > Date.now();

  return (
    <div className='mb-2' dir={isRtl ? 'rtl' : 'ltr'}>
      <p className='flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] leading-snug text-muted-foreground'>
        <span
          role='img'
          aria-label={labels.badgeAria}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset',
            'bg-violet-500/10 text-violet-800 ring-violet-500/25 dark:text-violet-300 dark:ring-violet-500/30'
          )}
        >
          <Icons.calendar className='size-3 shrink-0' aria-hidden />
          {labels.badge}
        </span>
        {formatted ? (
          <>
            <span className='font-medium text-foreground/85'>
              {isFuture ? labels.publishesAt : labels.wasScheduledFor}
            </span>
            <time
              dateTime={new Date(raw!).toISOString()}
              className='font-medium tabular-nums text-foreground'
            >
              {formatted}
            </time>
          </>
        ) : (
          <span className='text-muted-foreground'>{labels.noTime}</span>
        )}
      </p>
    </div>
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
    if (showPublisherPin && (st === 'SCHEDULED' || st === 'DRAFT')) {
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
  onCancelSchedule,
  onReschedulePublishAt,
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
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Announcement | null>(null);
  const [rescheduleLocal, setRescheduleLocal] = useState('');
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const titleId = `announcement-${announcement.id}-title`;
  const isDraftStatus = String(announcement.status ?? '').toUpperCase() === 'DRAFT';
  const clickOpensDraft = isDraftStatus && Boolean(onResumeDraft);
  const clickMarkReadActive =
    readTrigger === 'click' && !isRead && !isScheduledFuture(announcement) && !isDraftStatus;

  const closeReschedule = useCallback(() => {
    setRescheduleOpen(false);
    setRescheduleTarget(null);
    setRescheduleLocal('');
    setRescheduleBusy(false);
  }, []);

  const openReschedule = useCallback((a: Announcement) => {
    setRescheduleTarget(a);
    setRescheduleLocal(toDatetimeLocalValue(a.publishedAt));
    requestAnimationFrame(() => setRescheduleOpen(true));
  }, []);

  const minPublish = useMemo(() => (rescheduleOpen ? minPublishDatetimeLocal() : ''), [rescheduleOpen]);

  const confirmReschedule = useCallback(async () => {
    if (!rescheduleTarget || !onReschedulePublishAt) return;
    if (!rescheduleLocal.trim()) {
      toast.error('Choose a date and time');
      return;
    }
    const t = new Date(rescheduleLocal).getTime();
    if (!Number.isFinite(t) || t < Date.now() + 120_000) {
      toast.error('Publish time must be at least 2 minutes from now');
      return;
    }
    setRescheduleBusy(true);
    try {
      await onReschedulePublishAt(rescheduleTarget, new Date(rescheduleLocal).toISOString());
      closeReschedule();
    } catch {
      // Error toast from mutation onError.
    } finally {
      setRescheduleBusy(false);
    }
  }, [closeReschedule, onReschedulePublishAt, rescheduleLocal, rescheduleTarget]);

  useEffect(() => {
    setIsRead(Boolean(announcement.isRead));
  }, [announcement.id, announcement.isRead]);

  useEffect(() => {
    if (readTrigger !== 'viewport' || !cardRef.current) return;
    if (isDraftStatus) return;
    if (isScheduledFuture(announcement)) return;
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
    if (isScheduledFuture(announcement)) return;
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
    <>
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
          !isRead && !isScheduledFuture(announcement) && 'bg-primary/[0.012] ring-1 ring-primary/10'
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
                  {isScheduledFuture(announcement) && onReschedulePublishAt ? (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openReschedule(announcement);
                      }}
                    >
                      <Icons.calendar className='me-2 size-4' aria-hidden />
                      Reschedule…
                    </DropdownMenuItem>
                  ) : null}
                  {isScheduledFuture(announcement) && onCancelSchedule ? (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        void onCancelSchedule(announcement);
                      }}
                    >
                      <Icons.close className='me-2 size-4' aria-hidden />
                      Cancel schedule
                    </DropdownMenuItem>
                  ) : null}
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
            {isScheduledStatus(announcement) && <ScheduledStatusRow announcement={announcement} />}
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
          {!isRead && (
            <p className='sr-only' aria-live='polite'>
              Unread announcement
            </p>
          )}
        </CardContent>
      </Card>
    </article>

      <Dialog
        open={rescheduleOpen}
        onOpenChange={(open) => {
          if (!open) closeReschedule();
        }}
      >
        <DialogContent className='sm:max-w-md' onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Reschedule publish time</DialogTitle>
            <DialogDescription>
              Pick a new publish time. The server requires the time to be at least 2 minutes in the future.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 py-1'>
            <Label htmlFor='announcement-reschedule-at'>Publish date and time</Label>
            <Input
              id='announcement-reschedule-at'
              type='datetime-local'
              min={minPublish || undefined}
              value={rescheduleLocal}
              onChange={(e) => setRescheduleLocal(e.target.value)}
              disabled={rescheduleBusy}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button type='button' variant='outline' onClick={closeReschedule} disabled={rescheduleBusy}>
              Cancel
            </Button>
            <Button type='button' onClick={() => void confirmReschedule()} disabled={rescheduleBusy}>
              {rescheduleBusy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const AnnouncementCard = memo(AnnouncementCardBase);
