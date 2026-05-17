'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useServers, useUnreadSummary } from '../../api/queries';
import type { DiscussionServer } from '../../api/types';

function ServerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'S';
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function ServerRailItem({
  server,
  isActive,
  unreadCount,
  hrefBuilder
}: {
  server: DiscussionServer;
  isActive: boolean;
  unreadCount: number;
  hrefBuilder: (id: number) => string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={hrefBuilder(server.id)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'group relative flex items-center justify-center',
            'h-12 w-12 rounded-2xl bg-muted text-sm font-semibold',
            'text-muted-foreground transition-all',
            'hover:rounded-xl hover:bg-primary hover:text-primary-foreground',
            isActive &&
              'rounded-xl bg-primary text-primary-foreground shadow-sm'
          )}
        >
          {server.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={server.iconUrl}
              alt={server.name}
              className='h-full w-full rounded-[inherit] object-cover'
            />
          ) : (
            <span>{ServerInitials(server.name)}</span>
          )}
          <span
            aria-hidden
            className={cn(
              'absolute -left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all',
              isActive ? 'h-8' : unreadCount > 0 ? 'h-3' : 'group-hover:h-4'
            )}
          />
          {unreadCount > 0 && !isActive && (
            <span
              aria-label={`${unreadCount} unread`}
              className='absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground'
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side='right'>
        <div className='font-medium'>{server.name}</div>
        {server.scopeType ? (
          <div className='text-xs text-muted-foreground'>{server.scopeType}</div>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function ServerRail({
  activeServerId
}: {
  activeServerId: number | null;
}) {
  const { data, isLoading } = useServers();
  const { data: unreadSummary } = useUnreadSummary();

  const servers = useMemo(() => data?.results ?? [], [data]);

  const unreadByGroup = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of unreadSummary?.byGroup ?? []) {
      map.set(Number(row.groupId), Number(row.unreadCount));
    }
    return map;
  }, [unreadSummary]);

  const buildServerHref = (id: number) => `/dashboard/chat/${id}`;

  return (
    <aside
      aria-label='Workspaces'
      className='flex h-full w-[72px] shrink-0 flex-col items-center gap-2 border-r bg-muted/30 py-3'
    >
      <ScrollArea className='w-full flex-1'>
        <div className='flex flex-col items-center gap-2 px-3 pb-3'>
          {/* Faculty servers */}
          {isLoading && servers.length === 0 ? (
            <>
              <Skeleton className='h-12 w-12 rounded-2xl' />
              <Skeleton className='h-12 w-12 rounded-2xl' />
              <Skeleton className='h-12 w-12 rounded-2xl' />
            </>
          ) : (
            servers.map((s) => (
              <ServerRailItem
                key={s.id}
                server={s}
                isActive={s.id === activeServerId}
                unreadCount={unreadByGroup.get(s.id) ?? 0}
                hrefBuilder={buildServerHref}
              />
            ))
          )}

          {/* Divider */}
          {servers.length > 0 && (
            <div className='h-px w-6 bg-border my-1' />
          )}

          {/* Single "Clubs" icon — like a server icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href='/dashboard/clubs'
                className={cn(
                  'group relative flex items-center justify-center',
                  'h-12 w-12 rounded-2xl bg-muted text-sm font-semibold',
                  'text-muted-foreground transition-all',
                  'hover:rounded-xl hover:bg-primary hover:text-primary-foreground'
                )}
              >
                <Icons.teams className='h-5 w-5' />
                <span
                  aria-hidden
                  className='absolute -left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all group-hover:h-4'
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent side='right'>
              <div className='font-medium'>Clubs</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </ScrollArea>
    </aside>
  );
}
