'use client';

import { MessagesSquare } from 'lucide-react';
import type { ChatMessage } from '../../api/chat-types';
import { ChatMessageBubble } from './chat-message-bubble';
import { buildRenderPlan } from './render-plan';

type BubbleShared = {
  userId: number | null;
  flashId: number | null;
  editingId: number | null;
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
};

interface ChatTimelineProps extends BubbleShared {
  messages: ChatMessage[];
  firstUnreadId: number | null;
}

export function ChatTimeline({ messages, firstUnreadId, ...bubble }: ChatTimelineProps) {
  if (messages.length === 0) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3 text-center'>
        <div className='flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm'>
          <MessagesSquare className='size-7' />
        </div>
        <div>
          <p className='font-medium'>No messages yet</p>
          <p className='text-sm text-muted-foreground'>
            Say hello — start the conversation for this course.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {buildRenderPlan(messages, firstUnreadId).map((entry) => {
        if (entry.kind === 'day') {
          return (
            <div key={entry.key} className='sticky top-0 z-10 flex justify-center py-1'>
              <span className='rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur'>
                {entry.label}
              </span>
            </div>
          );
        }
        if (entry.kind === 'unread') {
          return (
            <div key={entry.key} className='flex items-center gap-2 py-1'>
              <span className='h-px flex-1 bg-primary/40' />
              <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary'>
                New messages
              </span>
              <span className='h-px flex-1 bg-primary/40' />
            </div>
          );
        }
        const item = entry.message;
        return (
          <ChatMessageBubble
            key={item.id}
            item={item}
            isOwn={item.senderId === bubble.userId}
            iWasMentioned={
              bubble.userId != null &&
              item.mentions.some((m) => m.userId === bubble.userId)
            }
            flash={bubble.flashId === item.id}
            editing={bubble.editingId === item.id}
            editDraft={bubble.editDraft}
            setEditDraft={bubble.setEditDraft}
            editPending={bubble.editPending}
            mentionLabels={bubble.mentionLabels}
            meSlug={bubble.meSlug}
            onRegisterRef={bubble.onRegisterRef}
            onJumpToReply={bubble.onJumpToReply}
            onReply={bubble.onReply}
            onStartEdit={bubble.onStartEdit}
            onCancelEdit={bubble.onCancelEdit}
            onSaveEdit={bubble.onSaveEdit}
            onDelete={bubble.onDelete}
          />
        );
      })}
    </div>
  );
}
