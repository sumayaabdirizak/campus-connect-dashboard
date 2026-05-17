'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadCount
} from '../../api/queries';
import type { DiscussionNotification } from '../../api/types';

function initialsFor(name: string | null | undefined): string {
  const source = name?.trim() ?? '';
  if (!source) return '?';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function notificationIcon(type: string) {
  switch (type) {
    case 'MENTION':
      return <Icons.user className='h-3.5 w-3.5 text-violet-500' />;
    case 'REACTION':
      return <Icons.heart className='h-3.5 w-3.5 text-rose-500' />;
    case 'PIN':
      return <Icons.pin className='h-3.5 w-3.5 text-amber-500' />;
    default:
      return <Icons.chat className='h-3.5 w-3.5 text-muted-foreground' />;
  }
}

function notificationLine(n: DiscussionNotification): string {
  const sender =
    n.display?.messageSenderName ??
    (typeof n.payload?.senderName === 'string' ? n.payload.senderName : null) ??
    (typeof n.payload?.reactorName === 'string' ? n.payload.reactorName : null) ??
    (typeof n.payload?.pinnedByName === 'string' ? n.payload.pinnedByName : null) ??
    'Someone';
  switch (n.type) {
    case 'MENTION':
      return `${sender} mentioned you`;
    case 'REACTION':
      return `${sender} reacted ${typeof n.payload?.emoji === 'string' ? n.payload.emoji : ''}`.trim();
    case 'PIN':
      return `${sender} pinned a message`;
    default:
      return `${sender} sent a message`;
  }
}

function buildHref(n: DiscussionNotification): string | null {
  const groupId =
    n.groupId ??
    (typeof n.payload?.groupId === 'number' ? n.payload.groupId : null);
  const channelId =
    typeof n.payload?.channelId === 'number' ? n.payload.channelId : null;
  const groupDmId =
    typeof n.payload?.groupDmId === 'number' ? n.payload.groupDmId : null;
  const messageId =
    n.messageId ??
    (typeof n.payload?.messageId === 'number' ? n.payload.messageId : null);

  if (groupDmId) return '/dashboard/chat';
  if (groupId && channelId) {
    const thread = messageId ? `?thread=${messageId}` : '';
    return `/dashboard/chat/${groupId}/${channelId}${thread}`;
  }
  return null;
}

function NotificationRow({
  notification,
  onClick
}: {
  notification: DiscussionNotification;
  onClick: () => void;
}) {
  const isUnread = !notification.readAt;
  const sender =
    notification.display?.messageSenderName ??
    (typeof notification.payload?.senderName === 'string'
      ? notification.payload.senderName
      : null) ??
    (typeof notification.payload?.reactorName === 'string'
      ? notification.payload.reactorName
      : null) ??
    'Someone';
  const channelLabel = notification.display?.channelHash;
  const groupLabel = notification.display?.groupLabel;
  const snippet = notification.display?.snippet;

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60',
        isUnread && 'bg-primary/5'
      )}
    >
      <Avatar className='h-7 w-7 shrink-0'>
        <AvatarFallback className='text-[10px]'>{initialsFor(sender)}</AvatarFallback>
      </Avatar>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          {notificationIcon(notification.type)}
          <span className='truncate text-xs font-medium'>{notificationLine(notification)}</span>
          {isUnread && (
            <span
              aria-label='Unread'
              className='ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary'
            />
          )}
        </div>
        <div className='mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground'>
          {channelLabel && <span className='truncate'>{channelLabel}</span>}
          {channelLabel && groupLabel && <span>·</span>}
          {groupLabel && <span className='truncate'>{groupLabel}</span>}
          <span className='ml-auto shrink-0'>{relativeTime(notification.createdAt)}</span>
        </div>
        {snippet && (
          <p className='mt-1 line-clamp-2 text-[11px] text-muted-foreground'>{snippet}</p>
        )}
      </div>
    </button>
  );
}

function NotificationList({
  filter,
  onItemClick
}: {
  filter: 'all' | 'unread';
  onItemClick: (n: DiscussionNotification) => void;
}) {
  const { data, isLoading } = useNotifications(filter);
  const items = data?.results ?? [];

  if (isLoading && items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-xs text-muted-foreground'>
        <Icons.spinner className='h-4 w-4 animate-spin' />
        Loading…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-xs text-muted-foreground'>
        <Icons.notification className='h-6 w-6 opacity-60' />
        {filter === 'unread' ? 'No unread notifications' : 'You’re all caught up'}
      </div>
    );
  }
  return (
    <div className='divide-y'>
      {items.map((n) => (
        <NotificationRow key={n.id} notification={n} onClick={() => onItemClick(n)} />
      ))}
    </div>
  );
}

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread' | 'mentions'>('all');
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkNotificationsRead();

  const unread = Number(unreadData?.unreadCount ?? 0);

  const handleItemClick = (n: DiscussionNotification) => {
    setOpen(false);
    if (!n.readAt) markRead.mutate({ notificationIds: [n.id] });
    const href = buildHref(n);
    if (href) router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='relative h-8 w-8'
          aria-label='Notifications'
        >
          <Icons.notification className='h-4 w-4' />
          {unread > 0 && (
            <span
              aria-label={`${unread} unread`}
              className='absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground'
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[360px] p-0'>
        <div className='flex items-center justify-between border-b px-3 py-2'>
          <span className='text-sm font-semibold'>Notifications</span>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-[11px]'
            disabled={unread === 0 || markRead.isPending}
            onClick={() => markRead.mutate({ markAll: true })}
          >
            Mark all read
          </Button>
        </div>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'all' | 'unread' | 'mentions')}
          className='flex flex-col'
        >
          <TabsList className='h-9 w-full justify-start rounded-none border-b bg-transparent p-0'>
            <TabsTrigger
              value='all'
              className={cn(
                'h-9 flex-1 rounded-none border-b-2 border-transparent bg-transparent shadow-none',
                'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'
              )}
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value='unread'
              className={cn(
                'h-9 flex-1 rounded-none border-b-2 border-transparent bg-transparent shadow-none',
                'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'
              )}
            >
              Unread{unread > 0 && (
                <span className='ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary'>
                  {unread}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value='mentions'
              className={cn(
                'h-9 flex-1 rounded-none border-b-2 border-transparent bg-transparent shadow-none',
                'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'
              )}
            >
              @ You
            </TabsTrigger>
          </TabsList>
          <ScrollArea className='h-[420px]'>
            <TabsContent value='all' className='m-0'>
              <NotificationList filter='all' onItemClick={handleItemClick} />
            </TabsContent>
            <TabsContent value='unread' className='m-0'>
              <NotificationList filter='unread' onItemClick={handleItemClick} />
            </TabsContent>
            <TabsContent value='mentions' className='m-0'>
              <MentionsList onItemClick={handleItemClick} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function MentionsList({
  onItemClick
}: {
  onItemClick: (n: DiscussionNotification) => void;
}) {
  const { data, isLoading } = useNotifications('all', 80);
  const mentions = (data?.results ?? []).filter((n) => n.type === 'MENTION');

  if (isLoading && mentions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-xs text-muted-foreground'>
        <Icons.spinner className='h-4 w-4 animate-spin' />
        Loading…
      </div>
    );
  }
  if (mentions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-xs text-muted-foreground'>
        <Icons.user className='h-6 w-6 opacity-60' />
        No one has mentioned you yet
      </div>
    );
  }
  return (
    <div className='divide-y'>
      {mentions.map((n) => (
        <NotificationRow key={n.id} notification={n} onClick={() => onItemClick(n)} />
      ))}
    </div>
  );
}
