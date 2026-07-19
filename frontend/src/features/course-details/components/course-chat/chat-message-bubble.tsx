'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { avatarGradient } from '@/features/discussions/utils/avatar-color';
import type { ChatMessage } from '../../api/chat-types';
import { ChatAttachments } from './chat-attachments';
import { ChatEditForm } from './chat-edit-form';
import { ChatMessageActions } from './chat-message-actions';
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
  onRegisterRef,
  onJumpToReply,
  onReply,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete
}: ChatMessageBubbleProps) {
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
          <div
            className={cn(
              'select-text w-fit max-w-full rounded-2xl px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
              isOwn
                ? 'rounded-br-md bg-primary text-primary-foreground'
                : 'rounded-bl-md bg-muted',
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
        )}
        <ChatAttachments attachments={item.attachments} isOwn={isOwn} />
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
