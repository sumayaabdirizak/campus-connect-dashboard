import { Icons } from '@/components/icons'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'
import { formatTime } from './format'

export function MessageBubbleMeta({
  message,
  isPending,
}: {
  message: DiscussionMessage
  isPending: boolean
}) {
  return (
    <span className='inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] leading-none text-muted-foreground'>
      {message.editedAt ? <span>edited</span> : null}
      {isPending ? (
        <span className='inline-flex items-center gap-1'>
          <Icons.spinner className='h-3 w-3 animate-spin' /> Sending…
        </span>
      ) : (
        <span className='tabular-nums'>{formatTime(message.createdAt)}</span>
      )}
    </span>
  )
}
