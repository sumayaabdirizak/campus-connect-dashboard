'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/components/avatar';
import { cn } from '@/lib/utils';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import { DiscussionReactionPillRow } from '@/lib/discussions/services/discussion-message-reactions';
import { avatarGradient } from '@/lib/discussions/services/avatar-color';
import { MessageContextWrapper } from '@/components/discussions/channel/message-actions-menu';
import { initialsFor } from './format';
import { MessageBubble } from './message-bubble';
import { MessageEditForm } from './message-edit-form';
import { MessageThreadPreview } from './message-thread-preview';
import type { MessageRowProps } from './types';
import { useMessageRow } from './use-message-row';

export function MessageRow({
  message,
  channelId,
  myUserId,
  myDisplayName,
  perms,
  showHeader,
  isPinned = false,
  onReplyInThread,
  onQuoteReply,
  onJumpToReply,
  onOptimisticReactionToggle,
  onOptimisticPatch,
  inThread = false
}: MessageRowProps) {
  const row = useMessageRow({
    message,
    channelId,
    myUserId,
    myDisplayName,
    onOptimisticReactionToggle,
    onOptimisticPatch
  });

  const rowBody = (
    <div
      className={cn(
        'group/row flex w-full max-w-full gap-2 px-3 py-0.5 sm:px-4',
        row.isAuthor ? 'justify-end' : 'justify-start',
        // WhatsApp-like density: more messages on screen
        showHeader ? 'mt-2.5' : 'mt-0.5',
        row.isPending && 'opacity-60'
      )}
    >
      {!row.isAuthor &&
        (showHeader ? (
          <Avatar className='mt-0.5 h-8 w-8 shrink-0 self-start ring-1 ring-black/5'>
            {!message.isAnonymous && message.sender?.avatarUrl ? (
              <AvatarImage
                src={resolvePublicAssetUrl(message.sender.avatarUrl) ?? undefined}
                alt={row.senderName}
              />
            ) : null}
            <AvatarFallback
              className='text-[10px] font-semibold text-white'
              style={{
                background: avatarGradient(row.senderName, message.isAnonymous)
              }}
            >
              {initialsFor(row.senderName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className='w-8 shrink-0' aria-hidden />
        ))}

      <div
        className={cn(
          // w-max keeps short bubbles from collapsing; max-w caps long ones
          'flex w-max max-w-[min(100%,75%)] flex-col',
          inThread && 'max-w-[calc(100%-2.5rem)]',
          row.isAuthor ? 'items-end' : 'items-start'
        )}
      >
        {row.isEditing ? (
          <MessageEditForm
            editValue={row.editValue}
            setEditValue={row.setEditValue}
            textareaRef={row.editTextareaRef}
            onSave={row.submitEdit}
            onCancel={() => row.setIsEditing(false)}
            isPending={row.editPending}
          />
        ) : (
          <MessageBubble
            message={message}
            channelId={channelId}
            isAuthor={row.isAuthor}
            isDeleted={row.isDeleted}
            isPending={row.isPending}
            senderName={row.senderName}
            showHeader={showHeader}
            perms={perms}
            isPinned={isPinned}
            inThread={inThread}
            onStartEdit={row.startEdit}
            onReplyInThread={onReplyInThread}
            onQuoteReply={onQuoteReply}
            onJumpToReply={onJumpToReply}
            onQuickReact={(emoji) => row.onToggleReaction(message.id, emoji)}
            onOptimisticPatch={onOptimisticPatch}
          />
        )}

        {!row.isDeleted &&
        !row.isEditing &&
        message.reactions &&
        message.reactions.length > 0 ? (
          <div className='mt-0.5'>
            <DiscussionReactionPillRow
              messageId={message.id}
              reactions={message.reactions}
              myUserId={myUserId ?? undefined}
              tone='hybrid'
              onToggle={row.onToggleReaction}
              showAddPicker={false}
            />
          </div>
        ) : null}

        {!row.isDeleted &&
        !inThread &&
        message.threadPreview &&
        message.threadPreview.replyCount > 0 ? (
          <MessageThreadPreview
            replyCount={message.threadPreview.replyCount}
            lastReplyAt={message.threadPreview.lastReplyAt}
            onOpen={() => onReplyInThread?.(message.id)}
          />
        ) : null}
      </div>
    </div>
  );

  if (row.isDeleted || row.isEditing || row.isPending) return rowBody;

  return (
    <MessageContextWrapper
      message={message}
      channelId={channelId}
      myUserId={myUserId}
      perms={perms}
      isAuthor={row.isAuthor}
      isPinned={isPinned}
      inThread={inThread}
      onReply={onReplyInThread ? () => onReplyInThread(message.id) : undefined}
      onQuoteReply={
        onQuoteReply && !inThread ? () => onQuoteReply(message) : undefined
      }
      onReact={(emoji) => row.onToggleReaction(message.id, emoji)}
      onOptimisticPatch={onOptimisticPatch}
      onEdit={row.startEdit}
    >
      {rowBody}
    </MessageContextWrapper>
  );
}
