'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/features/ui/components/sheet';
import { Button } from '@/features/ui/components/button';
import { Icons } from '@/components/icons';
import type { Announcement } from '@/lib/announcements/types';
import { useAnnouncementAnalytics } from '@/lib/announcements/queries/use-announcement-analytics';
import { AcknowledgementDrawer } from './acknowledgement-drawer';

/**
 * These charts live inside a sheet that opens on demand, so recharts has no
 * business loading with the announcements list. By the time the chunk is
 * fetched the user has already opened the sheet.
 */
const AnnouncementAnalyticsCharts = dynamic(
  () => import('./announcement-analytics-charts').then((m) => m.AnnouncementAnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className='h-56 animate-pulse rounded-xl border bg-card' aria-hidden />
    )
  }
);

export function AnnouncementAnalyticsSheet({
  announcement,
  open,
  onOpenChange
}: {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const id = announcement ? Number(announcement.id) : null;
  const validId = id != null && Number.isFinite(id) ? id : null;
  const { data, isLoading, error, refetch, isFetching } = useAnnouncementAnalytics(validId, open);
  const [ackOpen, setAckOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side='right' className='flex w-full flex-col gap-0 sm:max-w-lg'>
          <SheetHeader className='border-b border-border pb-4 text-left'>
            <SheetTitle className='flex items-center gap-2'>
              <Icons.barChart className='size-5' aria-hidden />
              Analytics
            </SheetTitle>
            <SheetDescription className='line-clamp-2'>
              {announcement?.title ?? 'Announcement metrics update about every 30s while this panel is open.'}
            </SheetDescription>
          </SheetHeader>

          <div className='flex flex-1 flex-col gap-4 overflow-hidden p-4'>
            {isLoading && (
              <div className='space-y-2 text-sm text-muted-foreground'>
                <div className='h-32 animate-pulse rounded-lg bg-muted' />
                <div className='h-24 animate-pulse rounded-lg bg-muted' />
              </div>
            )}
            {error && (
              <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>
                {error instanceof Error ? error.message : 'Could not load analytics.'}
                <Button type='button' variant='outline' size='sm' className='mt-2' onClick={() => void refetch()}>
                  Retry
                </Button>
              </div>
            )}
            {!isLoading && !error && data && (
              <AnnouncementAnalyticsCharts
                data={data}
                isFetching={isFetching}
                onOpenAck={() => setAckOpen(true)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AcknowledgementDrawer
        announcementId={validId}
        open={ackOpen}
        onOpenChange={setAckOpen}
        acknowledgementRequired={Boolean(announcement?.acknowledgementRequired)}
      />
    </>
  );
}
