'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { useAnnouncements } from '@/features/announcements/api/queries';

const MAX_VISIBLE = 6;

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Header notification bell — backed by real announcements (was previously a
 * mock store with fabricated entries). Shows recent announcements; the "new"
 * badge counts unread/recent ones.
 */
export function NotificationCenter() {
  const { data } = useAnnouncements();
  const announcements = data ?? [];
  const newCount = announcements.filter((a) => a.isNew).length;
  const visible = announcements.slice(0, MAX_VISIBLE);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='relative h-8 w-8'>
          <Icons.notification className='h-4 w-4' />
          {newCount > 0 && (
            <span className='bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium'>
              {newCount > 9 ? '9+' : newCount}
            </span>
          )}
          <span className='sr-only'>Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[calc(100vw-2rem)] p-0 sm:w-[380px]' sideOffset={8}>
        <div className='flex items-center justify-between px-4 py-3'>
          <Link href='/dashboard/notifications' className='group flex items-center gap-1'>
            <h4 className='text-sm font-semibold group-hover:underline'>Notifications</h4>
            <Icons.chevronRight className='text-muted-foreground h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
          </Link>
          {newCount > 0 && (
            <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs'>
              {newCount} new
            </span>
          )}
        </div>
        <Separator />
        <ScrollArea className='h-[400px]'>
          {visible.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <Icons.notification className='text-muted-foreground/40 mb-2 h-8 w-8' />
              <p className='text-muted-foreground text-sm'>No notifications yet</p>
            </div>
          ) : (
            <div className='flex flex-col'>
              {visible.map((a) => (
                <Link
                  key={a.id}
                  href='/dashboard/announcements'
                  className='flex flex-col gap-0.5 border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <span className='line-clamp-2 text-sm font-medium text-foreground'>{a.title}</span>
                    {a.isNew && <span className='mt-1.5 size-2 shrink-0 rounded-full bg-primary' />}
                  </div>
                  <span className='text-xs text-muted-foreground'>
                    {a.createdBy?.name ? `${a.createdBy.name} · ` : ''}
                    {timeAgo(a.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
