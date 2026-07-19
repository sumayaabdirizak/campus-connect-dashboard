'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useServerChannels } from '../../../api/queries'
import type { DiscussionChannel } from '../../../api/types'
import { channelIcon } from './helpers'

export function ChannelSublist({
  serverId,
  activeChannelId,
}: {
  serverId: number
  activeChannelId: number | null
}) {
  const router = useRouter()
  const { data } = useServerChannels(serverId)
  const channels: DiscussionChannel[] = data?.results ?? []
  if (channels.length === 0) return null

  return (
    <div className='mb-1 ml-[52px] mr-2 border-l border-border/60 pl-2'>
      {channels.map((ch) => {
        const Icon = channelIcon(String(ch.kind), ch.isPrivate)
        const active = ch.id === activeChannelId
        return (
          <button
            key={ch.id}
            type='button'
            onClick={() => router.push(`/dashboard/chat/${serverId}/${ch.id}`)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              active
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <Icon className='size-3.5 shrink-0' aria-hidden />
            <span className='truncate'>{ch.name}</span>
          </button>
        )
      })}
    </div>
  )
}
