'use client';

import { Megaphone, Pin, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Announcement } from '../api/types';

/** Narrow priority badge styling. */
function PriorityBadge({ priority }: { priority: string | undefined }) {
  if (!priority || priority === 'NORMAL') return null;
  const isUrgent = priority === 'URGENT';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        isUrgent
          ? 'bg-destructive/10 text-destructive'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      )}
    >
      {isUrgent ? <AlertTriangle className='h-3 w-3' /> : <Info className='h-3 w-3' />}
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

function authorInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function relativeDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** A single announcement card rendered inside the chat window area. */
function AnnouncementCard({
  announcement,
  isUnread,
}: {
  announcement: Announcement;
  isUnread: boolean;
}) {
  const author = (announcement as any).author?.full_name ?? (announcement as any).authorName ?? 'System';
  const scope = (announcement as any).broadcastScope ?? (announcement as any).scope ?? '';
  const hasAttachments = ((announcement as any).attachments ?? []).length > 0;

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200',
        'hover:border-primary/25 hover:shadow-md',
        isUnread && 'border-l-[3px] border-l-primary bg-primary/[0.03]'
      )}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <span
          aria-label='Unread'
          className='absolute right-4 top-4 h-2 w-2 rounded-full bg-primary'
        />
      )}

      {/* Header row */}
      <div className='mb-3 flex items-start gap-3'>
        <Avatar className='h-9 w-9 shrink-0'>
          <AvatarFallback className='bg-primary/10 text-primary text-xs font-semibold'>
            {authorInitials(author)}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='text-sm font-semibold text-foreground'>{author}</span>
            <PriorityBadge priority={(announcement as any).priority} />
            {(announcement as any).isPinned && (
              <span className='inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground'>
                <Pin className='h-2.5 w-2.5' />
                Pinned
              </span>
            )}
          </div>
          <div className='mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground'>
            <span>{relativeDate((announcement as any).publishedAt ?? (announcement as any).createdAt)}</span>
            {scope && scope !== 'ALL' && (
              <>
                <span aria-hidden>·</span>
                <Badge variant='outline' className='h-4 px-1.5 text-[10px]'>
                  {scope.charAt(0) + scope.slice(1).toLowerCase()}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className='mb-1.5 text-sm font-semibold leading-snug text-foreground'>
        {announcement.title}
      </h3>

      {/* Body */}
      {(announcement as any).body && (
        <p className='line-clamp-3 text-sm leading-relaxed text-muted-foreground'>
          {(announcement as any).body}
        </p>
      )}

      {/* Attachment hint */}
      {hasAttachments && (
        <div className='mt-2 flex items-center gap-1 text-[11px] text-muted-foreground'>
          <Megaphone className='h-3 w-3' />
          {((announcement as any).attachments ?? []).length} attachment
          {((announcement as any).attachments ?? []).length !== 1 ? 's' : ''}
        </div>
      )}
    </article>
  );
}

/** Empty state shown when there are no announcements. */
function EmptyAnnouncements() {
  return (
    <div className='flex flex-col items-center gap-4 px-8 py-16 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted'>
        <Megaphone className='h-8 w-8 text-muted-foreground/40' />
      </div>
      <div>
        <p className='text-sm font-medium text-foreground'>No announcements</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          Announcements from your faculty, department, or sections will appear here.
        </p>
      </div>
      <Link
        href='/dashboard/announcements'
        className='inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20'
      >
        Open Announcements
        <ChevronRight className='h-3.5 w-3.5' />
      </Link>
    </div>
  );
}

/**
 * IntegratedAnnouncementView — rendered in the chat window area when the user
 * selects "Announcements" from the unified sidebar. Wraps the existing data
 * fetching; does NOT duplicate backend calls.
 */
export function IntegratedAnnouncementView({
  announcements,
  isLoading,
  unreadIds,
}: {
  announcements: Announcement[];
  isLoading: boolean;
  unreadIds?: Set<number>;
}) {
  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <header className='flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-card/90 px-5 backdrop-blur'>
        <div className='flex items-center gap-2.5'>
          <div className='flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10'>
            <Megaphone className='h-4 w-4 text-primary' />
          </div>
          <div>
            <h2 className='font-display text-sm font-semibold leading-tight tracking-tight'>
              Announcements
            </h2>
            <p className='text-[11px] leading-none text-muted-foreground'>
              {announcements.length} in your feed
            </p>
          </div>
        </div>
        <Link
          href='/dashboard/announcements'
          className='inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary'
        >
          Full view
          <ChevronRight className='h-3.5 w-3.5' />
        </Link>
      </header>

      {/* Feed */}
      <div className='flex-1 overflow-y-auto px-4 py-4'>
        {isLoading ? (
          <div className='space-y-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='h-32 animate-pulse rounded-2xl bg-muted' />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <EmptyAnnouncements />
        ) : (
          <div className='space-y-3'>
            {announcements.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                isUnread={unreadIds?.has(Number(a.id)) ?? false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
