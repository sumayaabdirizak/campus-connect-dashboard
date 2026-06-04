'use client';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationFeed, type NotifItem } from '../utils/use-notification-feed';
import { NotificationItem } from './notification-item';

export default function NotificationsPage() {
  const { announcements, deadlines, loading } = useNotificationFeed();
  const all = [...deadlines, ...announcements];

  const renderList = (items: NotifItem[]) => {
    if (loading) {
      return (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-16 w-full rounded-lg' />
          ))}
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>Nothing here</p>
        </div>
      );
    }
    return (
      <div className='divide-y divide-border overflow-hidden rounded-lg border'>
        {items.map((item) => (
          <NotificationItem key={item.key} item={item} />
        ))}
      </div>
    );
  };

  return (
    <PageContainer
      scrollable
      pageTitle='Notifications'
      pageDescription='Upcoming deadlines and announcements for you.'
    >
      <Tabs defaultValue='all'>
        <TabsList>
          <TabsTrigger value='all'>All ({all.length})</TabsTrigger>
          <TabsTrigger value='deadlines'>Due soon ({deadlines.length})</TabsTrigger>
          <TabsTrigger value='announcements'>Announcements ({announcements.length})</TabsTrigger>
        </TabsList>
        <TabsContent value='all' className='mt-4'>
          {renderList(all)}
        </TabsContent>
        <TabsContent value='deadlines' className='mt-4'>
          {renderList(deadlines)}
        </TabsContent>
        <TabsContent value='announcements' className='mt-4'>
          {renderList(announcements)}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
