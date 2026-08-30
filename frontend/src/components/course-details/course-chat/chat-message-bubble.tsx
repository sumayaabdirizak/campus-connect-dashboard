'use client';

import { Avatar, AvatarFallback } from '@/features/ui/components/avatar';
import { cn } from '@/lib/utils';
import { avatarGradient } from '@/lib/discussions/services/avatar-color';
import type { ChatMessage } from '@/lib/course-details/types';
import { ChatAttachments } from './chat-attachments';
import { ChatEditForm } from './chat-edit-form';
import { ChatMessageActions } from './chat-message-actions';
import { shouldShowMessageText, type DisplayChatFile } from './chat-file-utils';
import { initialsOf, messageTime } from './chat-utils';
import { MessageContent } from './message-content';

interface ChatMessageBubbleProps {
  item: ChatMessage;
  isOwn: boolean;
  iWasMentioned: boolean;
  flash: boolean;
  editing: boolean;
  editDraft: string;
  setEditDraft: (v: string) => void;
  editPending: boolean;
  mentionLabels: Map<string, string>;
  meSlug: string | null;
  pendingFiles?: DisplayChatFile[];
  onRegisterRef: (id: number, node: HTMLDivElement | null) => void;
  onJumpToReply: (id: number) => void;
  onReply: (item: ChatMessage) => void;
  onStartEdit: (item: ChatMessage) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: (item: ChatMessage) => void;
}

export function ChatMessageBubble({
  item,
  isOwn,
  iWasMentioned,
  flash,
  editing,
  editDraft,
  setEditDraft,
  editPending,
  mentionLabels,
  meSlug,
  pendingFiles = [],
  onRegisterRef,
  onJumpToReply,
  onReply,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete
}: ChatMessageBubbleProps) {
  const hasFiles = item.attachments.length > 0 || pendingFiles.length > 0;
  const showText = shouldShowMessageText(
    item.content,
    item.attachments.length,
    pendingFiles.length
  );
  const fileOnly = hasFiles && !showText;

  return (
    <div
      ref={(node) => onRegisterRef(item.id, node)}
      className={cn(
        'group flex items-end gap-2 rounded-xl transition-colors',
        isOwn && 'flex-row-reverse',
        flash && 'bg-primary/10 ring-2 ring-primary/40'
      )}
    >
      <Avatar className='size-8'>
        <AvatarFallback
          className='text-[11px] font-semibold text-white'
          style={{ background: avatarGradient(item.sender.full_name) }}
        >
          {initialsOf(item.sender.full_name)}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'flex min-w-0 max-w-[78%] flex-col gap-1',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground',
            isOwn && 'justify-end'
          )}
        >
          {!isOwn ? (
            <span className='font-medium text-foreground'>{item.sender.full_name}</span>
          ) : null}
          <span>{messageTime(item.created_at)}</span>
          {item.editedAt ? <span>edited</span> : null}
        </div>
        {item.replyTo ? (
          <button
            type='button'
            onClick={() => item.replyTo && onJumpToReply(item.replyTo.id)}
            title='Jump to message'
            className={cn(
              'mb-1 block w-full max-w-sm cursor-pointer rounded-md border-l-2 bg-muted/50 px-3 py-2 text-left text-xs transition-colors hover:bg-muted',
              isOwn ? 'border-primary/50' : 'border-primary'
            )}
          >
            <span className='block font-medium'>{item.replyTo.sender.full_name}</span>
            <span className='block truncate text-muted-foreground'>
              {item.replyTo.content}
            </span>
          </button>
        ) : null}
        {editing ? (
          <ChatEditForm
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            editPending={editPending}
            onCancel={onCancelEdit}
            onSave={onSaveEdit}
          />
        ) : (
          <>
            {showText ? (
              <div
                className={cn(
                  'select-text w-fit max-w-full rounded-xl px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
                  isOwn
                    ? 'rounded-br-md bg-[#3B82F6] text-white'
                    : 'rounded-bl-md border border-[#E5E7EB] bg-white text-[#344054] dark:border-border dark:bg-card dark:text-foreground',
                  iWasMentioned && !isOwn && 'bg-primary/15 ring-1 ring-primary/30'
                )}
              >
                <MessageContent
                  content={item.content}
                  mentionLabels={mentionLabels}
                  meSlug={meSlug}
                  isOwn={isOwn}
                />
              </div>
            ) : null}
            {hasFiles ? (
              fileOnly ? (
                <div
                  className={cn(
                    'w-fit max-w-full rounded-xl p-2',
                    isOwn
                      ? 'rounded-br-md bg-[#3B82F6]'
                      : 'rounded-bl-md border border-[#E5E7EB] bg-white dark:border-border dark:bg-card'
                  )}
                >
                  <ChatAttachments
                    attachments={item.attachments}
                    pendingFiles={pendingFiles}
                    isOwn={isOwn}
                    embedded
                  />
                </div>
              ) : (
                <ChatAttachments
                  attachments={item.attachments}
                  pendingFiles={pendingFiles}
                  isOwn={isOwn}
                />
              )
            ) : null}
          </>
        )}
        <ChatMessageActions
          item={item}
          isOwn={isOwn}
          onReply={onReply}
          onStartEdit={onStartEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
