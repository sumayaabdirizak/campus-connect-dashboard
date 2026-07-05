'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore, useCallback } from 'react';
import { Icons } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useServer } from '../../api/queries';
import { useDiscussionPermissions } from '../../hooks/use-discussion-permissions';
import type { DiscussionChannel, DiscussionChannelCategory } from '../../api/types';
import { SidebarServerHeader } from './sidebar-server-header';
import { SidebarUserFooter } from './sidebar-user-footer';
import { ChannelCreateDialog } from '../channel/channel-create-dialog';
import { useMyClubs } from '@/features/clubs/api/queries';
import type { Club } from '@/features/clubs/api/types';

// ── Module-level collapse store ──────────────────────────────────────────────
// Lives outside React so it survives component remounts caused by Next.js route
// changes (each /chat/[serverId]/[channelId] page remounts ChatShellV2).
// Categories default to collapsed; clicking toggles them to expanded.
let _collapseState: Record<string, boolean> = {};
let _collapseListeners = new Set<() => void>();

function _getCollapseSnapshot() {
  return _collapseState;
}

function _subscribeCollapse(cb: () => void) {
  _collapseListeners.add(cb);
  return () => { _collapseListeners.delete(cb); };
}

function _toggleCollapse(key: string) {
  const wasCollapsed = _collapseState[key] !== false;
  _collapseState = { ..._collapseState, [key]: !wasCollapsed };
  _collapseListeners.forEach((cb) => cb());
}

function _isCategoryCollapsed(key: string) {
  return _collapseState[key] !== false;
}

function ClubsSidebarSection({ activeServerId }: { activeServerId: number | null }) {
  const { data: clubsData, isLoading } = useMyClubs()
  const [collapsed, setCollapsed] = useState(false)

  const allClubs = useMemo(() => {
    const seen = new Set<number>()
    const result: Club[] = []
    for (const club of [...(clubsData?.owned ?? []), ...(clubsData?.memberOf ?? [])]) {
      if (!seen.has(club.id)) {
        seen.add(club.id)
        result.push(club)
      }
    }
    return result
  }, [clubsData])

  if (isLoading) {
    return (
      <div className='flex flex-col'>
        <div className='flex h-7 items-center gap-1 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
          Clubs
        </div>
        <Skeleton className='mx-2 h-8 w-full' />
        <Skeleton className='mx-2 mt-1 h-8 w-full' />
      </div>
    )
  }

  return (
    <div className='flex flex-col'>
      {/* Section header */}
      <div className='group flex h-7 items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
        <button
          type='button'
          onClick={() => setCollapsed((c) => !c)}
          className='flex flex-1 items-center gap-1 truncate text-left transition-colors hover:text-foreground'
        >
          {collapsed ? (
            <Icons.chevronRight className='h-3 w-3' />
          ) : (
            <Icons.chevronDown className='h-3 w-3' />
          )}
          <span className='truncate'>Clubs</span>
        </button>
        <Link
          href='/dashboard/clubs'
          className='flex h-5 w-5 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground'
        >
          <Icons.add className='h-3 w-3' />
        </Link>
      </div>

      {/* Empty state */}
      {!collapsed && allClubs.length === 0 && (
        <Link
          href='/dashboard/clubs'
          className='mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <Icons.add className='h-3 w-3' />
          Browse clubs
        </Link>
      )}

      {/* Club rows */}
      {!collapsed && allClubs.map((club) => {
        const themeColor = club.themeColor || '#6366f1'
        const isActive = club.serverId === activeServerId
        const initials = club.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() || '')
          .join('')

        return (
          <Link
            key={club.id}
            href={club.serverId ? `/dashboard/chat/${club.serverId}` : `/dashboard/clubs/${club.slug}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group/row mx-2 flex h-8 items-center gap-2 rounded-md px-2 text-sm',
              'transition-colors hover:bg-muted hover:text-foreground',
              isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
            )}
          >
            {/* Club mini-icon */}
            <span
              className='flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold'
              style={{
                backgroundColor: `${themeColor}20`,
                color: themeColor,
              }}
            >
              {club.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={club.iconUrl} alt='' className='h-full w-full rounded object-cover' />
              ) : (
                initials
              )}
            </span>
            <span className='flex-1 truncate'>{club.name}</span>
            {club.status === 'PENDING' && (
              <span className='h-1.5 w-1.5 rounded-full bg-yellow-400' />
            )}
          </Link>
        )
      })}
    </div>
  )
}

function channelIcon(channel: DiscussionChannel) {
  if (channel.isPrivate) return Icons.lock ?? Icons.hash;
  switch (channel.kind) {
    case 'ANNOUNCEMENT':
      return Icons.speakerphone;
    case 'FORUM':
      return Icons.chat ?? Icons.hash;
    default:
      return Icons.hash;
  }
}

type GroupedChannels = {
  category: DiscussionChannelCategory | null;
  channels: DiscussionChannel[];
};

function groupChannels(
  categories: DiscussionChannelCategory[],
  channels: DiscussionChannel[]
): GroupedChannels[] {
  const byCategoryId = new Map<number | null, DiscussionChannel[]>();
  for (const ch of channels) {
    const key = ch.categoryId ?? null;
    if (!byCategoryId.has(key)) byCategoryId.set(key, []);
    byCategoryId.get(key)!.push(ch);
  }

  const sortedCategories = [...categories].toSorted(
    (a, b) => a.position - b.position || a.id - b.id
  );

  const groups: GroupedChannels[] = [];
  const uncategorized = byCategoryId.get(null);
  if (uncategorized && uncategorized.length > 0) {
    groups.push({ category: null, channels: uncategorized });
  }
  for (const cat of sortedCategories) {
    const list = byCategoryId.get(cat.id);
    if (!list || list.length === 0) continue;
    groups.push({ category: cat, channels: list });
  }
  return groups;
}

function CategoryHeader({
  label,
  collapsed,
  onToggle,
  rightSlot
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className='group flex h-7 items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
      <button
        type='button'
        onClick={onToggle}
        className='flex flex-1 items-center gap-1 truncate text-left transition-colors hover:text-foreground'
      >
        {collapsed ? (
          <Icons.chevronRight className='h-3 w-3' />
        ) : (
          <Icons.chevronDown className='h-3 w-3' />
        )}
        <span className='truncate'>{label}</span>
      </button>
      {rightSlot}
    </div>
  );
}

function ChannelRow({
  channel,
  isActive,
  href
}: {
  channel: DiscussionChannel;
  isActive: boolean;
  href: string;
}) {
  const Icon = channelIcon(channel);
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/row mx-2 flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground',
        'transition-colors hover:bg-muted hover:text-foreground',
        isActive && 'bg-primary/10 text-foreground'
      )}
    >
      <Icon className='h-4 w-4 shrink-0 opacity-70' />
      <span className='flex-1 truncate'>{channel.name}</span>
    </Link>
  );
}

export function ChannelSidebar({
  serverId,
  activeChannelId
}: {
  serverId: number | null;
  activeChannelId: number | null;
}) {
  const { data: serverDetail, isLoading: isLoadingServer } = useServer(serverId);

  const groups = useMemo(() => {
    if (!serverDetail) return [];
    return groupChannels(serverDetail.categories ?? [], serverDetail.channels ?? []);
  }, [serverDetail]);

  const serverPerms = useDiscussionPermissions(
    serverDetail?.myServerPermissions
  );
  const canManageChannel = serverPerms.canManageChannel;

  // Collapse state lives in a module-level store so it survives remounts
  // from Next.js route changes. Categories start collapsed on first visit;
  // manual toggles persist until page reload.
  const collapsed = useSyncExternalStore(_subscribeCollapse, _getCollapseSnapshot, _getCollapseSnapshot);

  const isCollapsed = useCallback((key: string) => _isCategoryCollapsed(key), [collapsed]);

  const toggle = useCallback((key: string) => _toggleCollapse(key), []);
  // null means "open with no preselected category"; a number preselects that
  // category in the dialog. `false` keeps the dialog closed.
  const [channelDialog, setChannelDialog] = useState<
    { open: boolean; categoryId: number | null }
  >({ open: false, categoryId: null });

  const buildChannelHref = (channelId: number) =>
    `/dashboard/chat/${serverId}/${channelId}`;

  return (
    <aside
      aria-label='Channels'
      className='flex h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden border-r bg-background'
    >
      {/* Clubs section — above Faculty header, completely separate */}
      <div className='max-h-40 shrink-0 overflow-y-auto border-b py-2'>
        <ClubsSidebarSection activeServerId={serverId} />
      </div>

      {/* Faculty server header */}
      <SidebarServerHeader server={serverDetail?.server ?? null} isLoading={isLoadingServer} />

      <div className='min-h-0 flex-1 overflow-hidden'>
        <ScrollArea className='h-full'>
          <div className='flex flex-col gap-1 py-2'>
          {isLoadingServer && groups.length === 0 ? (
            <div className='space-y-1 px-2'>
              <Skeleton className='h-7 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-7 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : groups.length === 0 ? (
            canManageChannel ? (
              <button
                type='button'
                onClick={() =>
                  setChannelDialog({ open: true, categoryId: null })
                }
                className='mx-2 flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground'
              >
                <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  <Icons.add className='h-4 w-4' />
                </span>
                Create your first channel
              </button>
            ) : (
              <div className='mx-2 rounded-lg border border-dashed px-3 py-4 text-center'>
                <Icons.hash className='mx-auto h-5 w-5 text-muted-foreground/50' />
                <p className='mt-1 text-[11px] text-muted-foreground'>No channels yet.</p>
              </div>
            )
          ) : (
            groups.map(({ category, channels }) => {
              const key = category ? `cat:${category.id}` : 'cat:none';
              const label = category?.name ?? 'Channels';
              const catCollapsed = isCollapsed(key);
              return (
                <div key={key} className='flex flex-col'>
                  <CategoryHeader
                    label={label}
                    collapsed={catCollapsed}
                    onToggle={() => toggle(key)}
                    rightSlot={
                      canManageChannel ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100'
                              aria-label='Add channel'
                              onClick={() =>
                                setChannelDialog({
                                  open: true,
                                  categoryId: category?.id ?? null
                                })
                              }
                            >
                              <Icons.add className='h-3 w-3' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side='top'>New channel</TooltipContent>
                        </Tooltip>
                      ) : null
                    }
                  />
                  {!catCollapsed &&
                    channels.map((ch) => (
                      <ChannelRow
                        key={ch.id}
                        channel={ch}
                        isActive={ch.id === activeChannelId}
                        href={buildChannelHref(ch.id)}
                      />
                    ))}
                </div>
              );
            })
          )}
          </div>
        </ScrollArea>
      </div>

      <SidebarUserFooter />

      {serverId != null && canManageChannel && (
        <ChannelCreateDialog
          open={channelDialog.open}
          onOpenChange={(next) =>
            setChannelDialog((s) => ({ ...s, open: next }))
          }
          serverId={serverId}
          categories={serverDetail?.categories ?? []}
          existingChannels={serverDetail?.channels ?? []}
          defaultCategoryId={channelDialog.categoryId}
        />
      )}
    </aside>
  );
}
