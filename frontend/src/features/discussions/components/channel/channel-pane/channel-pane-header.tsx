'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DiscussionPermissions } from '../../../hooks/use-discussion-permissions'
import { ChannelSearchPopover } from '../channel-search-popover'
import { NotificationsBell } from '../../notifications/notifications-panel'

export function ChannelPaneHeader({
  channelId,
  channelName,
  channelTopic,
  serverId,
  memberCount,
  e2eeEnabled,
  perms,
  isLoading,
  detailsOpen,
  onToggleDetails,
  onOpenSettings,
  onJumpToMessage,
}: {
  channelId: number
  channelName?: string
  channelTopic?: string | null
  serverId: number | null
  memberCount: number
  e2eeEnabled?: boolean
  perms: DiscussionPermissions
  isLoading: boolean
  detailsOpen: boolean
  onToggleDetails: () => void
  onOpenSettings: () => void
  onJumpToMessage: (messageId: number) => void
}) {
  const router = useRouter()

  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b border-[#0D3B66]/30 bg-[#0D3B66] px-4 shadow-sm text-white'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20'>
        <Icons.hash className='h-4 w-4' />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='truncate font-display text-sm font-semibold leading-tight tracking-tight text-white'>
          {isLoading ? <Skeleton className='h-4 w-32' /> : (channelName ?? '—')}
        </div>
        <div className='mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-white/70'>
          {memberCount > 0 ? (
            <span className='inline-flex items-center gap-1'>
              <Icons.teams className='h-3 w-3' />
              {memberCount} members
            </span>
          ) : null}
          {channelTopic && !isLoading ? (
            <>
              <span aria-hidden>·</span>
              <span className='truncate'>{channelTopic}</span>
            </>
          ) : (
            <span className='truncate'>Channel conversation</span>
          )}
        </div>
      </div>

      {e2eeEnabled ? (
        <span
          title='End-to-end encrypted'
          className='hidden items-center gap-1 rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-medium text-success sm:inline-flex'
        >
          <Icons.lock className='h-3 w-3' />
          Secure
        </span>
      ) : null}

      <div className='flex items-center gap-0.5'>
        <ChannelSearchPopover
          channelId={channelId}
          channelName={channelName}
          serverId={serverId}
          onJump={onJumpToMessage}
          onJumpToChannel={(targetChannelId, messageId) => {
            if (serverId == null) return
            router.push(
              `/dashboard/chat/${serverId}/${targetChannelId}?highlight=${messageId}`
            )
          }}
        />

        {perms.canManageChannel ? (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full text-white hover:bg-white/10'
            aria-label='Channel settings'
            onClick={onOpenSettings}
          >
            <Icons.settings className='h-4 w-4' />
          </Button>
        ) : null}

        <NotificationsBell />

        <Button
          type='button'
          variant='ghost'
          size='icon'
          className={cn(
            'h-8 w-8 rounded-full text-white transition-colors hover:bg-white/10',
            detailsOpen && 'bg-white/20 text-white'
          )}
          onClick={onToggleDetails}
          aria-label={detailsOpen ? 'Close details panel' : 'Open details panel'}
          aria-pressed={detailsOpen}
        >
          <Icons.info className='h-4 w-4' />
        </Button>
      </div>
    </header>
  )
}
