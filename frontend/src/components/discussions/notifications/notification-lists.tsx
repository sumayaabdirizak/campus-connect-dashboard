'use client'

import { Icons } from '@/components/icons'
import { useNotifications } from '@/lib/discussions/queries/queries'
import type { DiscussionNotification } from '@/lib/discussions/queries/types'
import { NotificationRow } from './notification-row'

export function NotificationList({
  filter,
  onItemClick,
}: {
  filter: 'all' | 'unread'
  onItemClick: (n: DiscussionNotification) => void
}) {
  const { data, isLoading } = useNotifications(filter)
  const items = data?.results ?? []

  if (isLoading && items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-xs text-muted-foreground'>
        <Icons.spinner className='h-4 w-4 animate-spin' />
        Loading…
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-xs text-muted-foreground'>
        <Icons.notification className='h-6 w-6 opacity-60' />
        {filter === 'unread' ? 'No unread notifications' : 'You’re all caught up'}
      </div>
    )
  }
  return (
    <div className='divide-y'>
      {items.map((n) => (
        <NotificationRow key={n.id} notification={n} onClick={() => onItemClick(n)} />
      ))}
    </div>
  )
}

export function MentionsList({
  onItemClick,
}: {
  onItemClick: (n: DiscussionNotification) => void
}) {
  const { data, isLoading } = useNotifications('all', 80)
  const mentions = (data?.results ?? []).filter((n) => n.type === 'MENTION')

  if (isLoading && mentions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-xs text-muted-foreground'>
        <Icons.spinner className='h-4 w-4 animate-spin' />
        Loading…
      </div>
    )
  }
  if (mentions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-1 px-6 py-10 text-xs text-muted-foreground'>
        <Icons.user className='h-6 w-6 opacity-60' />
        No one has mentioned you yet
      </div>
    )
  }
  return (
    <div className='divide-y'>
      {mentions.map((n) => (
        <NotificationRow key={n.id} notification={n} onClick={() => onItemClick(n)} />
      ))}
    </div>
  )
}
