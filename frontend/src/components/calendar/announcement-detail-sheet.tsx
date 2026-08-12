'use client';

import Link from 'next/link';
import { useQuery } from '@/lib/async-query';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { getAnnouncementById } from '@/lib/announcements/services';
import { AnnouncementContent } from '@/components/announcements/announcement-content';
import { fmtTime } from './lib';
import { isAllDayUtc } from './calendar-constants';

export function AnnouncementDetailSheet({
  detailId,
  onClose
}: {
  detailId: number | null;
  onClose: () => void;
}) {
  const { data: sheetAnnouncement, isFetching: detailLoading } = useQuery({
    queryKey: ['announcements', 'detail', detailId],
    queryFn: () => getAnnouncementById(detailId!),
    enabled: detailId != null
  });

  return (
    <Sheet open={detailId != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side='right' className='w-full overflow-y-auto sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>Announcement</SheetTitle>
          <SheetDescription>Deadline and full content for this announcement.</SheetDescription>
        </SheetHeader>
        {detailLoading ? (
          <p className='text-sm text-muted-foreground'>Loading…</p>
        ) : null}
        {!detailLoading && sheetAnnouncement ? (
          <article className='mt-4 space-y-3'>
            {sheetAnnouncement.deadlineAt ? (
              <p className='text-sm text-muted-foreground'>
                Deadline:{' '}
                <time dateTime={sheetAnnouncement.deadlineAt}>
                  {fmtTime(
                    sheetAnnouncement.deadlineAt,
                    isAllDayUtc(sheetAnnouncement.deadlineAt)
                  )}
                </time>
              </p>
            ) : null}
            {sheetAnnouncement.deadlineAt ? (
              <AddToCalendarButton
                deadline={{
                  kind: 'announcement',
                  id: sheetAnnouncement.id,
                  title: sheetAnnouncement.title,
                  due: new Date(sheetAnnouncement.deadlineAt),
                  allDay: isAllDayUtc(sheetAnnouncement.deadlineAt)
                }}
                className='text-xs text-muted-foreground'
              />
            ) : null}
            <AnnouncementContent
              announcement={sheetAnnouncement}
              showTargetingDetails={false}
            />
            <Button variant='outline' size='sm' asChild>
              <Link href='/dashboard/announcements'>Open in feed</Link>
            </Button>
          </article>
        ) : null}
        {!detailLoading && detailId != null && !sheetAnnouncement ? (
          <p className='text-sm text-muted-foreground'>Could not load this announcement.</p>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
