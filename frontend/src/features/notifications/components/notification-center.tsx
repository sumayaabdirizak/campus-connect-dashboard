'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotificationFeed } from '../utils/use-notification-feed';
import { NotificationItem } from './notification-item';

/**
 * Header notification bell — backed by the aggregated real feed (upcoming
 * assignment/quiz deadlines + recent announcements). The badge counts items
 * flagged "new" (due soon / recently posted).
 */
export function NotificationCenter() {
  const { recent, newCount } = useNotificationFeed();

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
          {recent.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <Icons.notification className='text-muted-foreground/40 mb-2 h-8 w-8' />
              <p className='text-muted-foreground text-sm'>You're all caught up</p>
            </div>
          ) : (
            <div className='flex flex-col divide-y divide-border'>
              {recent.map((item) => (
                <NotificationItem key={item.key} item={item} />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
