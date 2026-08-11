import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'
import { formatDmTime } from './dm-message-helpers'

export function DmMessageMeta({
  message,
  isAuthor,
  isPending,
  tickStatus,
}: {
  message: DiscussionMessage
  isAuthor: boolean
  isPending: boolean
  tickStatus?: 'seen' | 'sent' | null
}) {
  return (
    <span className='inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] leading-none text-[#98A2B3]'>
      {message.editedAt ? <span>edited</span> : null}
      {isPending ? (
        <span className='inline-flex items-center gap-1'>
          <Icons.spinner className='h-3 w-3 animate-spin' /> Sending…
        </span>
      ) : (
        <span className='tabular-nums'>{formatDmTime(message.createdAt)}</span>
      )}
      {isAuthor && !isPending && tickStatus ? (
        <Icons.checks
          className={cn(
            'h-3.5 w-3.5',
            tickStatus === 'seen' ? 'text-[#FF9F43]' : 'text-[#98A2B3]'
          )}
          aria-label={tickStatus === 'seen' ? 'Seen' : 'Delivered'}
        />
      ) : null}
    </span>
  )
}
