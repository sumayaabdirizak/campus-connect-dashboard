'use client'

import { cn } from '@/lib/utils'
import { DiscussionMessageMarkdown } from '@/lib/discussions/services/discussion-message-markdown'
import { DiscussionAttachmentCards } from '@/lib/discussions/services/discussion-attachment-cards'
import { DiscussionReactionPillRow } from '@/lib/discussions/services/discussion-message-reactions'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'
import { avatarSolid } from '@/lib/discussions/services/avatar-color'
import { DmMessageAvatar } from './dm-message-avatar'
import { DmMessageMeta } from './dm-message-meta'
import { DmMessageHoverToolbar } from './dm-message-hover-toolbar'
import { MessageReplyQuote } from '@/components/discussions/message-reply-quote'

export function DmMessageBubble({
  message,
  isAuthor,
  isOwner,
  isDeleted,
  isPending,
  myUserId,
  showHeader,
  hideIdentity,
  tickStatus,
  onReply,
  onToggleReaction,
  onStartEdit,
  onDelete,
}: {
  message: DiscussionMessage
  isAuthor: boolean
  isOwner: boolean
  isDeleted: boolean
  isPending: boolean
  myUserId: number | null
  showHeader: boolean
  /** 1:1 DM — no avatar / name (header already shows who). */
  hideIdentity?: boolean
  tickStatus?: 'seen' | 'sent' | null
  onReply?: () => void
  onToggleReaction: (messageId: string, emoji: string) => void
  onStartEdit: () => void
  onDelete: () => void
}) {
  const senderName = message.sender?.full_name ?? 'Unknown'
  const canDelete = isAuthor || isOwner
  const showIdentity = !hideIdentity && !isAuthor

  const meta = (
    <DmMessageMeta
      message={message}
      isAuthor={isAuthor}
      isPending={isPending}
      tickStatus={tickStatus}
    />
  )

  return (
    <div
      className={cn(
        'group/row flex w-full max-w-full gap-2 px-3 py-0.5 sm:px-4',
        isAuthor ? 'justify-end' : 'justify-start',
        showHeader && !hideIdentity ? 'mt-2.5' : 'mt-0.5',
        isPending && 'opacity-60'
      )}
    >
      {showIdentity ? (
        showHeader ? (
          <DmMessageAvatar name={senderName} avatarUrl={message.sender?.avatarUrl} />
        ) : (
          <span className='w-8 shrink-0' aria-hidden />
        )
      ) : null}

      <div
        className={cn(
          'flex w-max max-w-[min(100%,75%)] flex-col',
          isAuthor ? 'items-end' : 'items-start'
        )}
      >
        {showIdentity && showHeader && !isDeleted ? (
          <span
            className='mb-1 truncate text-[13px] font-semibold leading-snug'
            style={{ color: avatarSolid(senderName) }}
          >
            {senderName}
          </span>
        ) : null}

        <div
          className='relative'
          onDoubleClick={() => {
            if (!isDeleted && !isPending && onReply) onReply()
          }}
          onContextMenu={(e) => {
            if (!isDeleted && !isPending && onReply) {
              e.preventDefault()
              onReply()
            }
          }}
        >
          <div
            className={cn(
              'comm-bubble-in relative w-max max-w-full px-3 py-2 text-sm text-[#101828] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.03)]',
              isAuthor
                ? 'rounded-[15px_0_15px_15px] bg-[rgba(255,159,67,0.12)]'
                : 'rounded-[0_15px_15px_15px] bg-[#F6F7F8]',
              isDeleted && 'italic text-[#667085]',
              !isDeleted && !isPending && onReply && 'cursor-pointer'
            )}
          >
            {!isDeleted && !isPending ? (
              <DmMessageHoverToolbar
                isAuthor={isAuthor}
                canDelete={canDelete}
                onReply={onReply}
                onReact={(emoji) => onToggleReaction(message.id, emoji)}
                onEdit={onStartEdit}
                onDelete={onDelete}
              />
            ) : null}
            {isDeleted ? (
              <div className='flex items-end gap-2'>
                <p className='leading-snug'>This message was deleted.</p>
                {meta}
              </div>
            ) : (
              <>
                {message.replyTo ? (
                  <MessageReplyQuote replyTo={message.replyTo} />
                ) : null}
                {(message.content ?? '').trim().length > 0 ? (
                  <div className='flex items-end gap-2'>
                    <div className='min-w-0 max-w-full break-words leading-snug'>
                      <DiscussionMessageMarkdown
                        text={message.content ?? ''}
                        tone='hybrid'
                      />
                    </div>
                    {meta}
                  </div>
                ) : (
                  <div className='flex justify-end'>{meta}</div>
                )}

                {message.attachments && message.attachments.length > 0 ? (
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
        </div>

        {!isDeleted && message.reactions && message.reactions.length > 0 ? (
          <div className='mt-0.5'>
            <DiscussionReactionPillRow
              messageId={message.id}
              reactions={message.reactions}
              myUserId={myUserId ?? undefined}
              tone='hybrid'
              onToggle={onToggleReaction}
              showAddPicker={false}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
