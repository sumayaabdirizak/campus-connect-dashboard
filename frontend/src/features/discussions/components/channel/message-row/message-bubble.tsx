'use client'

import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import { DiscussionMessageMarkdown } from '../../../discussion-message-markdown'
import { DiscussionAttachmentCards } from '../../../discussion-attachment-cards'
import { getDiscussionMessagePlaintext } from '../../../decode-web-e2e-ciphertext'
import { avatarSolid } from '../../../utils/avatar-color'
import type { DiscussionMessage } from '../../../api/types'
import { formatTime } from './format'
import { MessageActionsToolbar } from './message-actions-toolbar'
import type { DiscussionPermissions } from '../../../hooks/use-discussion-permissions'

interface MessageBubbleProps {
  message: DiscussionMessage
  channelId: number
  isAuthor: boolean
  isDeleted: boolean
  isPending: boolean
  senderName: string
  showHeader: boolean
  perms: DiscussionPermissions
  isPinned: boolean
  inThread: boolean
  onStartEdit: () => void
  onReplyInThread?: (messageId: number) => void
  onQuickReact: (emoji: string) => void
  onOptimisticPatch?: (
    messageId: number,
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
  onQuickReact,
  onOptimisticPatch,
}: MessageBubbleProps) {
  const plain = getDiscussionMessagePlaintext({
    content: message.content,
    ciphertext: message.ciphertext,
    messageType: message.messageType,
  })

  return (
    <div
      className={cn(
        'comm-bubble-in relative w-fit max-w-[min(100%,28rem)] px-3 py-2 shadow-sm',
        isAuthor
          ? 'rounded-2xl rounded-br-sm bg-[#0066CC] text-white'
          : 'rounded-2xl rounded-bl-sm border border-border/60 bg-card text-card-foreground'
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
          onQuickReact={onQuickReact}
          onOptimisticPatch={onOptimisticPatch}
          onEdit={onStartEdit}
        />
      ) : null}

      {!isDeleted &&
      ((!isAuthor && showHeader) ||
        message.isAnonymous ||
        message.messageType === 'QUESTION') ? (
        <div className='mb-1 flex items-center gap-1.5'>
          {!isAuthor && showHeader ? (
            <span
              className='text-xs font-semibold'
              style={{ color: avatarSolid(senderName, message.isAnonymous) }}
            >
              {senderName}
            </span>
          ) : null}
          {message.isAnonymous ? (
            <span className='rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400'>
              anonymous
            </span>
          ) : null}
          {message.messageType === 'QUESTION' ? (
            <span className='rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400'>
              question
            </span>
          ) : null}
        </div>
      ) : null}

      {isDeleted ? (
        <p className='text-sm italic opacity-60'>This message was deleted.</p>
      ) : plain && plain.trim().length > 0 ? (
        <div className='text-[0.9375rem] leading-relaxed [overflow-wrap:anywhere]'>
          <DiscussionMessageMarkdown text={plain} tone='hybrid' />
        </div>
      ) : message.ciphertext ? (
        <p className='text-sm opacity-70'>🔒 Encrypted message</p>
      ) : null}

      {!isDeleted && message.attachments && message.attachments.length > 0 ? (
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
      ) : null}

      <div
        className={cn(
          'mt-1 flex items-center justify-end gap-1.5 text-[10px] leading-none',
          isAuthor ? 'text-white/70' : 'text-muted-foreground'
        )}
      >
        {message.editedAt ? <span>edited</span> : null}
        {isPending ? (
          <span className='inline-flex items-center gap-1'>
            <Icons.spinner className='h-3 w-3 animate-spin' /> Sending…
          </span>
        ) : (
          <span className='tabular-nums'>{formatTime(message.createdAt)}</span>
        )}
      </div>
    </div>
  )
}
