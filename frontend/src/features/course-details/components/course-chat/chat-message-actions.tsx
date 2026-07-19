'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../../api/chat-types';

interface ChatMessageActionsProps {
  item: ChatMessage;
  isOwn: boolean;
  onReply: (item: ChatMessage) => void;
  onStartEdit: (item: ChatMessage) => void;
  onDelete: (item: ChatMessage) => void;
}

export function ChatMessageActions({
  item,
  isOwn,
  onReply,
  onStartEdit,
  onDelete
}: ChatMessageActionsProps) {
  return (
    <div
      className={cn(
        'mt-1 flex items-center gap-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100',
        isOwn && 'justify-end'
      )}
    >
      <button type='button' className='hover:text-foreground' onClick={() => onReply(item)}>
        Reply
      </button>
      {isOwn ? (
        <>
          <button
            type='button'
            className='inline-flex items-center gap-1 hover:text-foreground'
            onClick={() => onStartEdit(item)}
          >
            <Pencil className='size-3' />
            Edit
          </button>
          <button
            type='button'
            className='inline-flex items-center gap-1 hover:text-destructive'
            onClick={() => onDelete(item)}
          >
            <Trash2 className='size-3' />
            Delete
          </button>
        </>
      ) : null}
    </div>
  );
}
