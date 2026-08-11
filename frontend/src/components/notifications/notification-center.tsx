'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/features/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/components/popover';
import { ScrollArea } from '@/features/ui/components/scroll-area';
import { Separator } from '@/features/ui/components/separator';
import { useNotificationFeed } from '@/lib/notifications/services';
import { NotificationItem } from './notification-item';
import { topbarLinkClass } from '@/features/layout/components/pharmacy/pharmacy-ui';

/**
 * Header notification bell — backed by the unified, read-aware feed (deadlines,
 * announcements, and discussion activity). The badge counts unread items.
 */
export function NotificationCenter({ variant = 'default' }: { variant?: 'default' | 'pharmacy' }) {
  const { recent, unreadCount, markRead, markAllRead } = useNotificationFeed();
  const defaultTriggerClass =
    'relative size-9 shrink-0 rounded-full bg-muted/70 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground';

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === 'pharmacy' ? (
          <button
            type='button'
            className={`${topbarLinkClass} relative`}
            aria-label='Open notifications'
          >
            <Icons.notification
              className={`size-[18px] ${unreadCount > 0 ? 'notification-bell-unread' : ''}`}
              aria-hidden='true'
            />
            {unreadCount > 0 ? (
              <span
                className='absolute top-2 right-2 size-2 rounded-full bg-success'
                aria-hidden='true'
              />
            ) : null}
            {unreadCount > 0 ? (
              <span className='sr-only'>{unreadCount} unread notifications</span>
            ) : null}
          </button>
        ) : (
          <Button
            variant='ghost'
            size='icon'
            className={defaultTriggerClass}
            aria-label='Open notifications'
          >
            <Icons.notification
              className={`size-[18px] ${unreadCount > 0 ? 'notification-bell-unread' : ''}`}
              aria-hidden='true'
            />
            {unreadCount > 0 ? (
              <span
                className='absolute top-1.5 right-1.5 size-2 rounded-full bg-success ring-2 ring-card'
                aria-hidden='true'
              />
            ) : null}
            {unreadCount > 0 ? (
              <span className='sr-only'>{unreadCount} unread notifications</span>
            ) : null}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align='end'
        className='relative w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-[#E5E7EB] p-0 shadow-lg sm:w-[380px]'
        sideOffset={8}
      >
        <div
          className='pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#13B5C9] via-[#0D76E1] to-[#8B5CF6]'
          aria-hidden
        />
        <div className='flex items-center justify-between px-4 py-3.5'>
          <Link href='/dashboard/notifications' className='group flex items-center gap-1.5'>
            <h4 className='text-sm font-bold text-[#101828] group-hover:underline'>
              Notifications
            </h4>
            {unreadCount > 0 ? (
              <span className='inline-flex items-center rounded-full bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-bold text-[#1D4ED8] ring-1 ring-[#BFDBFE]'>
                {unreadCount}
              </span>
            ) : null}
            <Icons.chevronRight className='size-3.5 text-[#98A2B3] transition-transform group-hover:translate-x-0.5' />
          </Link>
          {unreadCount > 0 ? (
            <button
              type='button'
              onClick={markAllRead}
              className='text-xs font-semibold text-[#3B82F6] hover:underline'
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <Separator className='bg-[#F2F4F7]' />
        <ScrollArea className='h-[400px]'>
          {recent.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <span className='mb-2 flex size-12 items-center justify-center rounded-full bg-[#F5F3FF] text-[#8B5CF6]'>
                <Icons.notification className='size-5' />
              </span>
              <p className='text-sm text-[#667085]'>You&apos;re all caught up</p>
            </div>
          ) : (
            <div className='flex flex-col divide-y divide-[#F2F4F7]'>
              {recent.map((item) => (
                <NotificationItem key={item.key} item={item} onRead={() => markRead(item)} />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
