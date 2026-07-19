import type { ReactNode } from 'react'
import { Icons } from '@/components/icons'
import type { DiscussionNotification } from '../../api/types'

export function initialsFor(name: string | null | undefined): string {
  const source = name?.trim() ?? ''
  if (!source) return '?'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function notificationIcon(type: string): ReactNode {
  switch (type) {
    case 'MENTION':
      return <Icons.user className='h-3.5 w-3.5 text-violet-500' />
    case 'REACTION':
      return <Icons.heart className='h-3.5 w-3.5 text-rose-500' />
    case 'PIN':
      return <Icons.pin className='h-3.5 w-3.5 text-amber-500' />
    default:
      return <Icons.chat className='h-3.5 w-3.5 text-muted-foreground' />
  }
}

export function notificationLine(n: DiscussionNotification): string {
  const sender =
    n.display?.messageSenderName ??
    (typeof n.payload?.senderName === 'string' ? n.payload.senderName : null) ??
    (typeof n.payload?.reactorName === 'string' ? n.payload.reactorName : null) ??
    (typeof n.payload?.pinnedByName === 'string' ? n.payload.pinnedByName : null) ??
    'Someone'
  switch (n.type) {
    case 'MENTION':
      return `${sender} mentioned you`
    case 'REACTION':
      return `${sender} reacted ${typeof n.payload?.emoji === 'string' ? n.payload.emoji : ''}`.trim()
    case 'PIN':
      return `${sender} pinned a message`
    default:
      return `${sender} sent a message`
  }
}

export function buildHref(n: DiscussionNotification): string | null {
  const groupId =
    n.groupId ??
    (typeof n.payload?.groupId === 'number' ? n.payload.groupId : null)
  const channelId =
    typeof n.payload?.channelId === 'number' ? n.payload.channelId : null
  const groupDmId =
    typeof n.payload?.groupDmId === 'number' ? n.payload.groupDmId : null
  const messageId =
    n.messageId ??
    (typeof n.payload?.messageId === 'number' ? n.payload.messageId : null)

  if (groupDmId) return '/dashboard/chat'
  if (groupId && channelId) {
    const thread = messageId ? `?thread=${messageId}` : ''
    return `/dashboard/chat/${groupId}/${channelId}${thread}`
  }
  return null
}

export function senderName(n: DiscussionNotification): string {
  return (
    n.display?.messageSenderName ??
    (typeof n.payload?.senderName === 'string' ? n.payload.senderName : null) ??
    (typeof n.payload?.reactorName === 'string' ? n.payload.reactorName : null) ??
    'Someone'
  )
}
