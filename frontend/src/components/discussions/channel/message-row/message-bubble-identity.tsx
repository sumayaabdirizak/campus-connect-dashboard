import { avatarSolid } from '@/lib/discussions/services/avatar-color'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'

export function MessageBubbleIdentity({
  message,
  senderName,
  isAuthor,
  showHeader,
}: {
  message: DiscussionMessage
  senderName: string
  isAuthor: boolean
  showHeader: boolean
}) {
  const show =
    (!isAuthor && showHeader) || message.isAnonymous || message.messageType === 'QUESTION'
  if (!show) return null

  return (
    <div className='mb-1 flex max-w-full items-center gap-1.5'>
      {!isAuthor && showHeader ? (
        <span
          className='truncate text-[13px] font-semibold leading-snug'
          style={{ color: avatarSolid(senderName, message.isAnonymous) }}
        >
          {senderName}
        </span>
      ) : null}
      {message.isAnonymous ? (
        <span className='shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700'>
          anonymous
        </span>
      ) : null}
      {message.messageType === 'QUESTION' ? (
        <span className='shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700'>
          question
        </span>
      ) : null}
    </div>
  )
}
