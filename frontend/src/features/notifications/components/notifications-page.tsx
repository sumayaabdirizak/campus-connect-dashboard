'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { useAnnouncements } from '@/features/announcements/api/queries';
import type { Announcement } from '@/features/announcements/api/types';

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
}

/** Notifications page — backed by real announcements (replaces the old mock store). */
export default function NotificationsPage() {
  const { data } = useAnnouncements();
  const announcements = data ?? [];
  const fresh = announcements.filter((a) => a.isNew);

  const renderList = (items: Announcement[]) => {
    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>No notifications</p>
        </div>
      );
    }
    return (
      <div className='flex flex-col gap-2'>
        {items.map((a) => (
          <Link
            key={a.id}
            href='/dashboard/announcements'
            className='flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50'
          >
            <span className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <Icons.notification className='h-4 w-4' />
            </span>
            <div className='min-w-0 flex-1'>
              <div className='flex items-start justify-between gap-2'>
                <p className='text-sm font-medium text-foreground'>{a.title}</p>
                {a.isNew && <span className='mt-1.5 size-2 shrink-0 rounded-full bg-primary' />}
              </div>
              <p className='text-xs text-muted-foreground'>
                {a.createdBy?.name ? `${a.createdBy.name} · ` : ''}
                {timeAgo(a.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <PageContainer
      scrollable
      pageTitle='Notifications'
      pageDescription='Recent announcements for you.'
    >
      <Tabs defaultValue='all'>
        <TabsList>
          <TabsTrigger value='all'>All ({announcements.length})</TabsTrigger>
          <TabsTrigger value='new'>New ({fresh.length})</TabsTrigger>
        </TabsList>
        <TabsContent value='all' className='mt-4'>
          {renderList(announcements)}
        </TabsContent>
        <TabsContent value='new' className='mt-4'>
          {renderList(fresh)}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
