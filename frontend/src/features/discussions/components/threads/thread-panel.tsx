'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useThreadMessages } from '../../hooks/use-thread-messages';
import { useChannelRoom } from '../../hooks/use-discussion-room';
import { MessageRow } from '../channel/message-row';
import { DaySeparator, isSameLocalDay } from '../channel/day-separator';
import { MessageComposer } from '../composer/message-composer';
import type { DiscussionPermissions } from '../../hooks/use-discussion-permissions';

const SAME_AUTHOR_GROUP_WINDOW_MS = 5 * 60 * 1000;

function shouldShowHeader(
  prev: { senderId: number | null; createdAt: string; isAnonymous?: boolean } | null,
  curr: { senderId: number | null; createdAt: string; isAnonymous?: boolean }
): boolean {
  if (!prev) return true;
  if (prev.senderId !== curr.senderId) return true;
  if (Boolean(prev.isAnonymous) !== Boolean(curr.isAnonymous)) return true;
  const prevMs = new Date(prev.createdAt).getTime();
  const currMs = new Date(curr.createdAt).getTime();
  if (currMs - prevMs > SAME_AUTHOR_GROUP_WINDOW_MS) return true;
  return false;
}

export function ThreadPanel({
  channelId,
  threadRootId,
  channelName,
  myUserId,
  myDisplayName,
  perms,
  pinnedSet,
  e2eeEnabled,
  e2eeKeyVersion,
  onClose
}: {
  channelId: number;
  threadRootId: number;
  channelName?: string;
  myUserId: number | null;
  myDisplayName?: string | null;
  perms: DiscussionPermissions;
  pinnedSet?: ReadonlySet<number>;
  e2eeEnabled?: boolean;
  e2eeKeyVersion?: number;
  onClose: () => void;
}) {
  // Joining the channel room here is redundant when the parent ChannelPane
  // also has this hook active (refcounted), but it keeps ThreadPanel
  // standalone if it's ever rendered without the main pane.
  useChannelRoom(channelId);

  const {
    root,
    replies,
    isLoading,
    hasMore,
    isLoadingOlder,
    loadOlder,
    addOptimisticReply,
    replaceOptimisticReply,
    removeOptimisticReply
  } = useThreadMessages(channelId, threadRootId);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);

  // Snap to bottom on first load
  useEffect(() => {
    if (initialScrollDoneRef.current) return;
    if (!root) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    initialScrollDoneRef.current = true;
  }, [root, replies.length]);

  // Reset on thread change
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [threadRootId]);

  // Top sentinel triggers loadOlder for older replies
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const rootEl = scrollRef.current;
    if (!sentinel || !rootEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !isLoadingOlder) {
            void loadOlder();
          }
        }
      },
      { root: rootEl, rootMargin: '120px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingOlder, loadOlder]);

  return (
    <aside
      aria-label='Thread'
      className='flex h-full w-[400px] shrink-0 flex-col border-l bg-background'
    >
      <header className='flex h-12 shrink-0 items-center justify-between border-b px-4'>
        <div className='min-w-0'>
          <div className='text-sm font-semibold'>Thread</div>
          {channelName && (
            <div className='truncate text-xs text-muted-foreground'>#{channelName}</div>
          )}
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          aria-label='Close thread'
          onClick={onClose}
        >
          <Icons.close className='h-4 w-4' />
        </Button>
      </header>

      <div ref={scrollRef} className='relative flex-1 overflow-y-auto'>
        {isLoading && !root ? (
          <div className='space-y-4 px-4 py-4'>
            <Skeleton className='h-12 w-3/4' />
            <Skeleton className='h-12 w-2/3' />
          </div>
        ) : !root ? (
          <div className='m-auto flex max-w-xs flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground'>
            <Icons.warning className='h-6 w-6' />
            <p className='text-sm'>This thread is no longer available.</p>
          </div>
        ) : (
          <>
            <div ref={sentinelRef} className='h-1' aria-hidden />

            <MessageRow
              message={root}
              channelId={channelId}
              myUserId={myUserId}
              perms={perms}
              isPinned={pinnedSet?.has(root.id) ?? false}
              showHeader
              inThread
            />

            <div className='border-b px-6 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
              {replies.length === 0
                ? 'No replies yet'
                : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </div>

            {(() => {
              const items: React.ReactElement[] = [];
              let prev: typeof replies[number] | null = null;
              for (const m of replies) {
                const showDay = !prev || !isSameLocalDay(prev.createdAt, m.createdAt);
                if (showDay) {
                  items.push(<DaySeparator key={`day-${m.id}`} iso={m.createdAt} />);
                }
                items.push(
                  <MessageRow
                    key={`reply-${m.id}`}
                    message={m}
                    channelId={channelId}
                    myUserId={myUserId}
                    perms={perms}
                    isPinned={pinnedSet?.has(m.id) ?? false}
                    showHeader={showDay || shouldShowHeader(prev, m)}
                    inThread
                  />
                );
                prev = m;
              }
              return items;
            })()}
          </>
        )}
      </div>

      <MessageComposer
        channelId={channelId}
        channelName={channelName}
        perms={perms}
        e2eeEnabled={e2eeEnabled}
        e2eeKeyVersion={e2eeKeyVersion}
        parentMessageId={threadRootId}
        placeholder='Reply in thread…'
        myUserId={myUserId}
        myDisplayName={myDisplayName}
        onOptimisticInsert={addOptimisticReply}
        onOptimisticReplace={replaceOptimisticReply}
        onOptimisticRemove={removeOptimisticReply}
      />
    </aside>
  );
}
