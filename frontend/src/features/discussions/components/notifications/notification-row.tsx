'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { DiscussionNotification } from '../../api/types'
import {
  initialsFor,
  notificationIcon,
  notificationLine,
  relativeTime,
  senderName,
} from './notification-helpers'

export function NotificationRow({
  notification,
  onClick,
}: {
  notification: DiscussionNotification
  onClick: () => void
}) {
  const isUnread = !notification.readAt
  const sender = senderName(notification)
  const channelLabel = notification.display?.channelHash
  const groupLabel = notification.display?.groupLabel
  const snippet = notification.display?.snippet

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60',
        isUnread && 'bg-primary/5'
      )}
    >
      <Avatar className='h-7 w-7 shrink-0'>
        <AvatarFallback className='text-[10px]'>{initialsFor(sender)}</AvatarFallback>
      </Avatar>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          {notificationIcon(notification.type)}
          <span className='truncate text-xs font-medium'>{notificationLine(notification)}</span>
          {isUnread && (
            <span
              aria-label='Unread'
              className='ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary'
            />
          )}
        </div>
        <div className='mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground'>
          {channelLabel && <span className='truncate'>{channelLabel}</span>}
          {channelLabel && groupLabel && <span>·</span>}
          {groupLabel && <span className='truncate'>{groupLabel}</span>}
          <span className='ml-auto shrink-0'>{relativeTime(notification.createdAt)}</span>
        </div>
        {snippet && (
          <p className='mt-1 line-clamp-2 text-[11px] text-muted-foreground'>{snippet}</p>
        )}
      </div>
    </button>
  )
}
