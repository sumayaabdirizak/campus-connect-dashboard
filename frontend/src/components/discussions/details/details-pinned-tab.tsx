'use client'

import { Pin } from 'lucide-react'
import { Button } from '@/features/ui/components/button'
import { Skeleton } from '@/features/ui/components/skeleton'
import {
  useChannel,
  useChannelPins,
  useServer,
  useUnpinMessage,
} from '@/lib/discussions/queries/queries'
import { useDiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions'
import { formatChannelPinPreview } from '@/lib/discussions/services/format-channel-pin-preview'

export function DetailsPinnedTab({
  channelId,
  onJumpToMessage,
}: {
  channelId: string
  onJumpToMessage?: (messageId: string) => void
}) {
  const { data, isLoading, isError, refetch } = useChannelPins(channelId)
  const unpin = useUnpinMessage(channelId)
  const { data: channelData } = useChannel(channelId)
  const serverId = channelData?.channel?.serverId ?? null
  const { data: serverData } = useServer(serverId)
  const perms = useDiscussionPermissions(
    channelData?.myPermissions ?? serverData?.myServerPermissions
  )
  const canManagePins = perms.canPin || perms.isAdmin
  const pins = data?.results ?? []

  if (isLoading) {
    return (
      <div className='space-y-2 p-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-14 w-full rounded-lg' />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className='space-y-2 px-4 py-8 text-center'>
        <p className='text-xs text-destructive'>Couldn&apos;t load pins</p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (pins.length === 0) {
    return (
      <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
        <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-muted'>
          <Pin className='h-5 w-5 text-muted-foreground/50' />
        </div>
        <p className='max-w-full text-xs break-words text-muted-foreground'>
          Pinned messages will appear here. Pin a message to highlight it for
          the whole channel.
        </p>
      </div>
    )
  }

  return (
    <ul className='divide-y divide-border/60 p-1'>
      {pins.map((pin) => (
        <li key={pin.id}>
          <button
            type='button'
            className='flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60'
            onClick={() => onJumpToMessage?.(pin.messageId)}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='truncate text-xs font-medium text-foreground'>
                {pin.message?.sender?.full_name ?? 'Unknown'}
              </span>
              <span className='shrink-0 text-[10px] tabular-nums text-muted-foreground'>
                {new Date(pin.pinnedAt).toLocaleDateString()}
              </span>
            </div>
            <p className='line-clamp-2 text-xs leading-snug text-muted-foreground'>
              {formatChannelPinPreview(pin)}
            </p>
          </button>
          {canManagePins ? (
            <div className='flex justify-end px-3 pb-2'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-7 text-[11px] text-muted-foreground'
                disabled={unpin.isPending}
                onClick={() => unpin.mutate(pin.messageId)}
              >
                Unpin
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
