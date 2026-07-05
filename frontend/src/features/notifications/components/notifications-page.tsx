'use client';

import { useMemo, useState } from 'react';
import { Check, Inbox, Search } from 'lucide-react';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotificationFeed, type NotifItem } from '../utils/use-notification-feed';
import { NotificationTimeline } from './notification-timeline';

type Filter = 'all' | 'announcement' | 'deadline' | 'discussion';

function matchesFilter(item: NotifItem, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'deadline')
    return item.source === 'assignment' || item.source === 'quiz';
  return item.source === filter;
}

/** Decorative scalloped divider under the card header (à la the reference). */
function WavyDivider() {
  return (
    <div
      className='h-2 w-full'
      aria-hidden
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='8' viewBox='0 0 24 8'%3E%3Cpath d='M0 4 Q6 0 12 4 T24 4' fill='none' stroke='%23cbd5e1' stroke-width='1'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'center'
      }}
    />
  );
}

export default function NotificationsPage() {
  const { items, unreadCount, markRead, markAllRead, loading } = useNotificationFeed();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const counts = useMemo(
    () => ({
      all: items.length,
      announcement: items.filter((i) => i.source === 'announcement').length,
      deadline: items.filter((i) => i.source === 'assignment' || i.source === 'quiz')
        .length,
      discussion: items.filter((i) => i.source === 'discussion').length
    }),
    [items]
  );

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    const now = Date.now();
    return items
      .filter(
        (i) =>
          matchesFilter(i, filter) &&
          (query ? `${i.title} ${i.body}`.toLowerCase().includes(query) : true)
      )
      .sort(
        (a, b) =>
          Math.abs(new Date(a.at).getTime() - now) -
          Math.abs(new Date(b.at).getTime() - now)
      );
  }, [items, filter, q]);

  const FILTERS: [Filter, string][] = [
    ['all', `All (${counts.all})`],
    ['announcement', `Announcements (${counts.announcement})`],
    ['deadline', `Due soon (${counts.deadline})`],
    ['discussion', `Discussions (${counts.discussion})`]
  ];

  return (
    <PageContainer scrollable>
      <div className='mx-auto w-full max-w-3xl space-y-4'>
        {/* Toolbar: filters + search + mark all */}
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex flex-wrap gap-1'>
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type='button'
                onClick={() => setFilter(key)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filter === key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className='ml-auto flex items-center gap-2'>
            <div className='relative w-44 sm:w-56'>
              <Search className='text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2' />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search…'
                className='h-9 pl-9'
              />
            </div>
            <Button
              variant='outline'
              size='sm'
              className='h-9 gap-1.5'
              disabled={unreadCount === 0}
              onClick={markAllRead}
            >
              <Check className='size-3.5' aria-hidden />
              Mark all read
            </Button>
          </div>
        </div>

        {/* Timeline card */}
        <div className='overflow-hidden rounded-2xl border bg-card shadow-sm'>
          <div className='flex items-start justify-between px-5 py-4'>
            <div>
              <h2 className='text-base font-semibold text-foreground'>Notifications</h2>
              <p className='text-sm text-muted-foreground'>
                You have {unreadCount} new{' '}
                {unreadCount === 1 ? 'notification' : 'notifications'}.
              </p>
            </div>
            <span className='text-muted-foreground flex size-9 items-center justify-center'>
              <Inbox className='size-5' />
            </span>
          </div>

          <WavyDivider />

          <div className='p-3'>
            {loading ? (
              <div className='flex flex-col gap-3 p-2'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className='flex items-center gap-4'>
                    <Skeleton className='size-10 shrink-0 rounded-full' />
                    <div className='flex-1 space-y-1.5'>
                      <Skeleton className='h-4 w-1/2' />
                      <Skeleton className='h-3 w-3/4' />
                    </div>
                  </div>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16'>
                <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
                <p className='text-muted-foreground text-sm'>Nothing here</p>
              </div>
            ) : (
              <NotificationTimeline items={visible} onRead={markRead} />
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
