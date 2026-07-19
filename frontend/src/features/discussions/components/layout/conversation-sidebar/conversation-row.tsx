'use client'

import { cn } from '@/lib/utils'
import { avatarGradient } from '../../../utils/avatar-color'
import type { DiscussionServer } from '../../../api/types'
import { ChannelSublist } from './channel-sublist'
import { initialsOf } from './helpers'

function formatRowTime(ts: string | undefined | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (now.toDateString() === d.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (yesterday.toDateString() === d.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short' })
}

type ServerExtras = DiscussionServer & {
  lastMessageAt?: string | null
  lastMessageText?: string | null
  muted?: boolean
  pinned?: boolean
}

export function ConversationRow({
  server,
  activeServerId,
  activeChannelId,
  unreadCount,
  onOpen,
}: {
  server: DiscussionServer
  activeServerId: number | null
  activeChannelId: number | null
  unreadCount: number
  onOpen: () => void
}) {
  const s = server as ServerExtras
  const active = server.id === activeServerId
  const isClub = server.kind === 'USER_SERVER'
  const hasUnread = unreadCount > 0
  const preview =
    s.lastMessageText || server.description || (isClub ? 'Club chat' : 'Faculty space')

  return (
    <div>
      <button
        type='button'
        onClick={onOpen}
        className={cn(
          'comm-row group mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-2xl px-3 py-2.5 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          active ? 'bg-primary/10 shadow-sm ring-1 ring-primary/10' : 'hover:bg-muted/80'
        )}
      >
        <div className='relative shrink-0'>
          {server.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={server.iconUrl}
              alt=''
              className='h-12 w-12 rounded-full object-cover ring-2 ring-background'
            />
          ) : (
            <span
              className='flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-background'
              style={{ background: avatarGradient(server.name) }}
            >
              {initialsOf(server.name)}
            </span>
          )}
          <span
            aria-hidden
            className={cn(
              'absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-card',
              isClub ? 'bg-[var(--comm-online)]' : 'bg-primary/70'
            )}
          />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-2'>
            <p
              className={cn(
                'truncate text-[0.9375rem] leading-tight',
                hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'
              )}
            >
              {server.name}
            </p>
            <span
              className={cn(
                'shrink-0 text-[10px] tabular-nums',
                hasUnread ? 'font-semibold text-primary' : 'text-muted-foreground'
              )}
            >
              {formatRowTime(s.lastMessageAt)}
            </span>
          </div>
          <div className='mt-0.5 flex items-center justify-between gap-2'>
            <p
              className={cn(
                'truncate text-xs',
                hasUnread ? 'font-medium text-foreground/70' : 'text-muted-foreground'
              )}
            >
              {s.muted ? 'Muted · ' : ''}
              {preview}
            </p>
            {hasUnread ? (
              <span
                aria-label={`${unreadCount} unread`}
                className='ml-1 inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground'
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : s.pinned ? (
              <span className='text-[10px] text-muted-foreground'>Pinned</span>
            ) : null}
          </div>
        </div>
      </button>

      {active ? (
        <div className='mx-2 mb-1 mt-0.5'>
          <ChannelSublist serverId={server.id} activeChannelId={activeChannelId} />
        </div>
      ) : null}
    </div>
  )
}
