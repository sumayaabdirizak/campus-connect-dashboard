'use client';

import type { RefObject } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '../../api/chat-types';
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
    <div className='relative'>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className='h-[500px] overflow-y-auto bg-muted/40 px-4 py-4'
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in oklch, var(--muted-foreground) 14%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
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
