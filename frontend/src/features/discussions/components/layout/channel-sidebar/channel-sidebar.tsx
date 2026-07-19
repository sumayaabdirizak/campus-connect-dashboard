'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { Icons } from '@/components/icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useServer } from '../../../api/queries'
import { useDiscussionPermissions } from '../../../hooks/use-discussion-permissions'
import { SidebarServerHeader } from '../sidebar-server-header'
import { SidebarUserFooter } from '../sidebar-user-footer'
import { ChannelCreateDialog } from '../../channel/channel-create-dialog'
import {
  getCollapseSnapshot,
  isCategoryCollapsed,
  subscribeCollapse,
  toggleCollapse,
} from './collapse-store'
import { CategoryHeader, ChannelRow, groupChannels } from './channel-sidebar-helpers'
import { ClubsSidebarSection } from './clubs-sidebar-section'

export function ChannelSidebar({
  serverId,
  activeChannelId,
}: {
  serverId: number | null
  activeChannelId: number | null
}) {
  const { data: serverDetail, isLoading: isLoadingServer } = useServer(serverId)

  const groups = useMemo(() => {
    if (!serverDetail) return []
    return groupChannels(serverDetail.categories ?? [], serverDetail.channels ?? [])
  }, [serverDetail])

  const serverPerms = useDiscussionPermissions(serverDetail?.myServerPermissions)
  const canManageChannel = serverPerms.canManageChannel

  const collapsed = useSyncExternalStore(
    subscribeCollapse,
    getCollapseSnapshot,
    getCollapseSnapshot
  )
  const isCollapsed = useCallback((key: string) => isCategoryCollapsed(key), [collapsed])
  const toggle = useCallback((key: string) => toggleCollapse(key), [])

  const [channelDialog, setChannelDialog] = useState<{
    open: boolean
    categoryId: number | null
  }>({ open: false, categoryId: null })

  const buildChannelHref = (channelId: number) => `/dashboard/chat/${serverId}/${channelId}`

  return (
    <aside
      aria-label='Channels'
      className='flex h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden border-r bg-background'
    >
      <div className='max-h-40 shrink-0 overflow-y-auto border-b py-2'>
        <ClubsSidebarSection activeServerId={serverId} />
      </div>

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
                  onClick={() => setChannelDialog({ open: true, categoryId: null })}
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
                const key = category ? `cat:${category.id}` : 'cat:none'
                const label = category?.name ?? 'Channels'
                const catCollapsed = isCollapsed(key)
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
                                    categoryId: category?.id ?? null,
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
                    {!catCollapsed
                      ? channels.map((ch) => (
                          <ChannelRow
                            key={ch.id}
                            channel={ch}
                            isActive={ch.id === activeChannelId}
                            href={buildChannelHref(ch.id)}
                          />
                        ))
                      : null}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <SidebarUserFooter />

      {serverId != null && canManageChannel ? (
        <ChannelCreateDialog
          open={channelDialog.open}
          onOpenChange={(next) => setChannelDialog((s) => ({ ...s, open: next }))}
          serverId={serverId}
          categories={serverDetail?.categories ?? []}
          existingChannels={serverDetail?.channels ?? []}
          defaultCategoryId={channelDialog.categoryId}
        />
      ) : null}
    </aside>
  )
}
