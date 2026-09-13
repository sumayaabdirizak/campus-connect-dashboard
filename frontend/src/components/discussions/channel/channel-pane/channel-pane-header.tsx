'use client'

import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { Button } from '@/features/ui/components/button'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/features/ui/components/skeleton'
import { cn } from '@/lib/utils'
import {
  ChatIdentityAvatar,
  ChatIdentityText
} from '@/components/inbox/chat-identity'
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions'
import { ChannelSearchPopover } from '@/components/discussions/channel/channel-search-popover'

export function ChannelPaneHeader({
  channelId,
  channelName,
  conversationTitle,
  serverId,
  serverName,
  serverIconUrl,
  memberCount,
  e2eeEnabled,
  perms,
  isLoading,
  detailsOpen,
  onToggleDetails,
  onOpenSettings,
  onJumpToMessage,
}: {
  channelId: string
  channelName?: string
  channelTopic?: string | null
  conversationTitle?: string | null
  serverId: string | null
  serverName?: string | null
  serverIconUrl?: string | null
  memberCount: number
  e2eeEnabled?: boolean
  perms: DiscussionPermissions
  isLoading: boolean
  detailsOpen: boolean
  onToggleDetails: () => void
  onOpenSettings: () => void
  onJumpToMessage: (messageId: string) => void
}) {
  const router = useRouter()
  const identityTitle =
    conversationTitle?.trim() ||
    serverName?.trim() ||
    channelName ||
    'Channel'
  // DreamsPOS chat-header: short status line (name + one subtitle).
  const subtitle =
    [
      channelName ? `#${channelName}` : null,
      memberCount > 0 ? `${memberCount} members` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'Channel'

  return (
    <header
      className={cn(
        'flex min-h-[72px] min-w-0 shrink-0 items-center justify-between gap-3',
        'border-b border-[rgba(145,158,171,0.3)] bg-card px-4 py-3.5 sm:px-6',
      )}
    >
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <ChatIdentityAvatar
          title={identityTitle}
          avatarUrl={serverIconUrl}
          badge={<Users className='size-2.5 text-muted-foreground' aria-hidden />}
        />

        {isLoading ? (
          <div className='min-w-0 flex-1 space-y-1.5'>
            <Skeleton className='h-4 w-36' />
            <Skeleton className='h-3 w-28 max-w-full' />
          </div>
        ) : (
          <ChatIdentityText
            title={identityTitle}
            subtitle={subtitle}
            titleClassName='text-[15px] font-semibold leading-none text-foreground'
          />
        )}

        {e2eeEnabled ? (
          <span
            title='End-to-end encrypted'
            className='hidden shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:inline-flex'
          >
            <Icons.lock className='h-3 w-3' />
            Secure
          </span>
        ) : null}
      </div>

      <div className='flex shrink-0 items-center gap-0.5'>
        <div className='hidden sm:block'>
          <ChannelSearchPopover
            channelId={channelId}
            channelName={channelName}
            serverId={serverId}
            onJump={onJumpToMessage}
            onJumpToChannel={(targetChannelId, messageId) => {
              if (serverId == null) return
              router.push(
                `/dashboard/messages?server=${serverId}&channel=${targetChannelId}&highlight=${messageId}`
              )
            }}
          />
        </div>

        {perms.canManageChannel ? (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='hidden size-10 rounded-full text-foreground hover:bg-muted sm:inline-flex'
            aria-label='Channel settings'
            onClick={onOpenSettings}
          >
            <Icons.settings className='h-5 w-5' />
          </Button>
        ) : null}

        <Button
          type='button'
          variant='ghost'
          size='icon'
          className={cn(
            'size-10 rounded-full text-foreground transition-colors hover:bg-muted',
            detailsOpen && 'bg-muted text-primary'
          )}
          onClick={onToggleDetails}
          aria-label={detailsOpen ? 'Close details panel' : 'Open details panel'}
          aria-pressed={detailsOpen}
        >
          <Icons.info className='h-5 w-5' />
        </Button>
      </div>
    </header>
  )
}
