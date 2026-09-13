'use client';

import type { RefObject } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import type { ChatMessage } from '@/lib/course-details/types';
import type { DisplayChatFile } from './chat-file-utils';
import { ChatTimeline } from './chat-timeline';

interface ChatMessageListProps {
  messages: ChatMessage[];
  firstUnreadId: number | null;
  hasMore?: boolean;
  nextCursor?: number | null;
  loadOlderPending: boolean;
  onLoadOlder: (cursor: number) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  atBottom: boolean;
  newCount: number;
  onJumpToLatest: () => void;
  userId: number | null;
  flashId: number | null;
  editingId: number | null;
  editDraft: string;
  setEditDraft: (v: string) => void;
  editPending: boolean;
  mentionLabels: Map<string, string>;
  meSlug: string | null;
  pendingByMessageId: Map<number, DisplayChatFile[]>;
  onRegisterRef: (id: number, node: HTMLDivElement | null) => void;
  onJumpToReply: (id: number) => void;
  onReply: (item: ChatMessage) => void;
  onStartEdit: (item: ChatMessage) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: (item: ChatMessage) => void;
}

export function ChatMessageList(props: ChatMessageListProps) {
  const {
    messages,
    firstUnreadId,
    hasMore,
    nextCursor,
    loadOlderPending,
    onLoadOlder,
    scrollRef,
    messagesEndRef,
    onScroll,
    atBottom,
    newCount,
    onJumpToLatest
  } = props;

  return (
    <div className='relative flex min-h-0 flex-1 flex-col'>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className='min-h-0 flex-1 overflow-y-auto bg-[#F2F4F7] px-4 py-4 dark:bg-muted/20'
      >
        {hasMore && nextCursor != null ? (
          <div className='mb-4 flex justify-center'>
            <Button
              variant='outline'
              size='sm'
              disabled={loadOlderPending}
              onClick={() => onLoadOlder(nextCursor)}
            >
              {loadOlderPending ? <Loader2 className='mr-2 size-3 animate-spin' /> : null}
              Load older
            </Button>
          </div>
        ) : null}
        <ChatTimeline
          messages={messages}
          firstUnreadId={firstUnreadId}
          userId={props.userId}
          flashId={props.flashId}
          editingId={props.editingId}
          editDraft={props.editDraft}
          setEditDraft={props.setEditDraft}
          editPending={props.editPending}
          mentionLabels={props.mentionLabels}
          meSlug={props.meSlug}
          onRegisterRef={props.onRegisterRef}
          onJumpToReply={props.onJumpToReply}
          onReply={props.onReply}
          onStartEdit={props.onStartEdit}
          onCancelEdit={props.onCancelEdit}
          onSaveEdit={props.onSaveEdit}
          onDelete={props.onDelete}
          pendingByMessageId={props.pendingByMessageId}
        />
        <div ref={messagesEndRef} />
      </div>
      {!atBottom ? (
        <button
          type='button'
          onClick={onJumpToLatest}
          className='absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105'
        >
          <ChevronDown className='size-4' />
          {newCount > 0
            ? `${newCount} new message${newCount === 1 ? '' : 's'}`
            : 'Jump to latest'}
        </button>
      ) : null}
    </div>
  );
}
