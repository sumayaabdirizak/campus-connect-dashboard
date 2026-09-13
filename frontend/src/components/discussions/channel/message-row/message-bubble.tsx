'use client'

import { cn } from '@/lib/utils'
import { DiscussionMessageMarkdown } from '@/lib/discussions/services/discussion-message-markdown'
import { DiscussionAttachmentCards } from '@/lib/discussions/services/discussion-attachment-cards'
import { getDiscussionMessagePlaintext } from '@/lib/discussions/services/decode-web-e2e-ciphertext'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'
import { MessageActionsToolbar } from './message-actions-toolbar'
import { MessageBubbleMeta } from './message-bubble-meta'
import { MessageBubbleIdentity } from './message-bubble-identity'
import { MessageReplyQuote } from '@/components/discussions/message-reply-quote'
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions'

interface MessageBubbleProps {
  message: DiscussionMessage
  channelId: string
  isAuthor: boolean
  isDeleted: boolean
  isPending: boolean
  senderName: string
  showHeader: boolean
  perms: DiscussionPermissions
  isPinned: boolean
  inThread: boolean
  onStartEdit: () => void
  onReplyInThread?: (messageId: string) => void
  onQuoteReply?: (message: DiscussionMessage) => void
  onJumpToReply?: (messageId: string) => void
  onQuickReact: (emoji: string) => void
  onOptimisticPatch?: (
    messageId: string,
    patch: Partial<DiscussionMessage>
  ) => () => void
}

export function MessageBubble({
  message,
  channelId,
  isAuthor,
  isDeleted,
  isPending,
  senderName,
  showHeader,
  perms,
  isPinned,
  inThread,
  onStartEdit,
  onReplyInThread,
  onQuoteReply,
  onJumpToReply,
  onQuickReact,
  onOptimisticPatch,
}: MessageBubbleProps) {
  const plain = getDiscussionMessagePlaintext({
    content: message.content,
    ciphertext: message.ciphertext,
    messageType: message.messageType,
  })

  const meta = <MessageBubbleMeta message={message} isPending={isPending} />

  return (
    <div
      className={cn(
        'comm-bubble-in relative w-max max-w-full px-3 py-2 text-sm text-foreground',
        isAuthor
          ? 'rounded-[15px_0_15px_15px] bg-[rgba(255,159,67,0.12)]'
          : 'rounded-[0_15px_15px_15px] bg-[#F6F7F8]'
      )}
    >
      {!isDeleted && !isPending ? (
        <MessageActionsToolbar
          message={message}
          channelId={channelId}
          isAuthor={isAuthor}
          perms={perms}
          isPinned={isPinned}
          inThread={inThread}
          onReplyInThread={onReplyInThread}
          onQuoteReply={onQuoteReply}
          onQuickReact={onQuickReact}
          onOptimisticPatch={onOptimisticPatch}
          onEdit={onStartEdit}
        />
      ) : null}

      {!isDeleted ? (
        <MessageBubbleIdentity
          message={message}
          senderName={senderName}
          isAuthor={isAuthor}
          showHeader={showHeader}
        />
      ) : null}

      {isDeleted ? (
        <div className='flex items-end gap-2'>
          <p className='text-sm italic leading-snug text-muted-foreground'>
            This message was deleted.
          </p>
          {meta}
        </div>
      ) : (
        <>
          {message.replyTo ? (
            <MessageReplyQuote
              replyTo={message.replyTo}
              onJump={onJumpToReply}
            />
          ) : null}
          {plain && plain.trim().length > 0 ? (
            <div className='flex items-end gap-2'>
              <div className='min-w-0 max-w-full break-words leading-snug text-foreground'>
                <DiscussionMessageMarkdown text={plain} tone='hybrid' />
              </div>
              {meta}
            </div>
          ) : message.ciphertext ? (
            <div className='flex items-end gap-2'>
              <p className='text-sm leading-snug text-muted-foreground'>
                🔒 Encrypted message
              </p>
              {meta}
            </div>
          ) : (
            <div className='flex justify-end'>{meta}</div>
          )}

          {!isDeleted &&
          message.attachments &&
          message.attachments.length > 0 ? (
            <div className='mt-1.5'>
              <DiscussionAttachmentCards
                attachments={message.attachments.map((a) => ({
                  id: a.id,
                  fileType: a.fileType,
                  mimeType: a.mimeType,
                  size: a.size,
                  url: a.url,
                  accessUrl: a.accessUrl,
                  isE2EE: a.isE2EE,
                }))}
                tone='hybrid'
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
