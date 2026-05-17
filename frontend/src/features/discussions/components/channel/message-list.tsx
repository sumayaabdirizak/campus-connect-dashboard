'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ChannelMessagesStore } from '../../hooks/use-channel-messages';
import type { DiscussionPermissions } from '../../hooks/use-discussion-permissions';
import type { DiscussionMessage } from '../../api/types';
import { DaySeparator, isSameLocalDay } from './day-separator';
import { MessageRow } from './message-row';

const SCROLL_BOTTOM_THRESHOLD = 120;
const SAME_AUTHOR_GROUP_WINDOW_MS = 5 * 60 * 1000;
const ESTIMATED_ROW_HEIGHT = 64;

function shouldShowHeader(prev: DiscussionMessage | null, curr: DiscussionMessage): boolean {
  if (!prev) return true;
  if (prev.senderId !== curr.senderId) return true;
  if (Boolean(prev.isAnonymous) !== Boolean(curr.isAnonymous)) return true;
  const prevMs = new Date(prev.createdAt).getTime();
  const currMs = new Date(curr.createdAt).getTime();
  if (currMs - prevMs > SAME_AUTHOR_GROUP_WINDOW_MS) return true;
  return false;
}

type ListItem =
  | {
      kind: 'day';
      key: string;
      iso: string;
    }
  | {
      kind: 'message';
      key: string;
      message: DiscussionMessage;
      showHeader: boolean;
    };

function buildItems(messages: DiscussionMessage[]): ListItem[] {
  const items: ListItem[] = [];
  let prev: DiscussionMessage | null = null;
  for (const m of messages) {
    const showDay = !prev || !isSameLocalDay(prev.createdAt, m.createdAt);
    if (showDay) {
      items.push({ kind: 'day', key: `day-${m.id}`, iso: m.createdAt });
    }
    items.push({
      kind: 'message',
      key: `msg-${m.id}`,
      message: m,
      showHeader: showDay || shouldShowHeader(prev, m)
    });
    prev = m;
  }
  return items;
}

export function MessageList({
  channelId,
  myUserId,
  myDisplayName,
  perms,
  channelName,
  pinnedSet,
  onReplyInThread,
  highlightMessageId,
  store
}: {
  channelId: number;
  myUserId: number | null;
  myDisplayName?: string | null;
  perms: DiscussionPermissions;
  channelName?: string;
  /** Set of message ids that are currently pinned in this channel. */
  pinnedSet?: ReadonlySet<number>;
  onReplyInThread?: (messageId: number) => void;
  /** When set, scrolls that message into view and pulses it (e.g. clicking a pin). */
  highlightMessageId?: number | null;
  /** Lifted store so the composer can drive optimistic inserts. */
  store: ChannelMessagesStore;
}) {
  const {
    messages,
    isLoading,
    isLoadingOlder,
    hasMore,
    loadOlder,
    error,
    optimisticToggleReaction,
    optimisticPatchMessage
  } = store;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Track whether the user is pinned to the bottom; when so, auto-scroll on
  // new messages arriving via socket. Otherwise leave the scroll position
  // alone (could surface a "new messages" pill in a later phase).
  const wasAtBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  const items = useMemo(() => buildItems(messages), [messages]);

  // ── Virtualizer ─────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
    // Keep the same item identity across re-renders so measured sizes
    // survive when day separators shift positions on prepend.
    getItemKey: (index) => items[index]?.key ?? index
  });

  // ── Initial fill: snap to bottom ────────────────────────────────────────
  useLayoutEffect(() => {
    if (initialScrollDoneRef.current) return;
    if (items.length === 0) return;
    virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    initialScrollDoneRef.current = true;
  }, [items.length, virtualizer]);

  // Reset on channel switch.
  useEffect(() => {
    initialScrollDoneRef.current = false;
    wasAtBottomRef.current = true;
  }, [channelId]);

  // ── Auto-scroll to bottom when new messages arrive AND we were at the
  // ── bottom. Skip when the user has scrolled up to read history.
  const lastBottomItemKeyRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!initialScrollDoneRef.current) return;
    if (items.length === 0) return;
    const newestKey = items[items.length - 1].key;
    if (newestKey === lastBottomItemKeyRef.current) return;
    lastBottomItemKeyRef.current = newestKey;
    if (wasAtBottomRef.current) {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    }
  }, [items, virtualizer]);

  // ── Watch the user's scroll position ────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      wasAtBottomRef.current = distanceFromBottom < SCROLL_BOTTOM_THRESHOLD;
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  // ── Highlight (pin click / cross-channel jump) ─────────────────────────
  useEffect(() => {
    if (highlightMessageId == null) return;
    const idx = items.findIndex(
      (it) => it.kind === 'message' && it.message.id === highlightMessageId
    );
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: 'center' });
    }
  }, [highlightMessageId, items, virtualizer]);

  // ── Top sentinel triggers loadOlder ────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !isLoadingOlder) {
            void loadOlder();
          }
        }
      },
      { root, rootMargin: '240px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingOlder, loadOlder]);

  const totalSize = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={scrollRef} className='relative flex-1 overflow-y-auto'>
      {isLoading && items.length === 0 ? (
        <div className='space-y-4 px-6 py-6'>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='flex gap-3'>
              <Skeleton className='h-9 w-9 shrink-0 rounded-full' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-4 w-3/4' />
              </div>
            </div>
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <div className='flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground'>
          <Icons.warning className='h-10 w-10 text-destructive/70' />
          <p className='text-sm font-medium text-foreground'>Couldn’t load messages</p>
          <p className='max-w-md break-words text-xs text-muted-foreground'>
            {error.message || 'The server returned an error.'}
          </p>
          <p className='text-[11px] text-muted-foreground'>
            Open DevTools (F12) → Network tab → look for the failed{' '}
            <code className='rounded bg-muted px-1 font-mono'>
              /api/discussions/channels/{channelId}/messages
            </code>{' '}
            request to see the status code.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className={cn('flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground')}>
          <Icons.hash className='h-10 w-10 opacity-60' />
          <p className='text-sm font-medium'>No messages yet</p>
          <p className='text-xs'>Be the first to say hi.</p>
        </div>
      ) : (
        <>
          <div ref={sentinelRef} className='h-1' aria-hidden />

          {isLoadingOlder && (
            <div className='flex items-center justify-center py-2'>
              <Icons.spinner className='h-4 w-4 animate-spin text-muted-foreground' />
            </div>
          )}

          {!hasMore && initialScrollDoneRef.current && (
            <div className='mx-auto max-w-md px-6 py-6 text-center text-muted-foreground'>
              <Icons.hash className='mx-auto h-8 w-8 opacity-60' />
              <p className='mt-2 text-sm font-medium'>
                This is the beginning of {channelName ? `#${channelName}` : 'this channel'}
              </p>
            </div>
          )}

          {/* Tall spacer = total virtualized height. Each rendered item is
              absolutely positioned at its measured offset. */}
          <div
            style={{ height: `${totalSize}px`, position: 'relative' }}
            className='pb-2'
          >
            {virtualItems.map((vi) => {
              const item = items[vi.index];
              if (!item) return null;
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`
                  }}
                >
                  {item.kind === 'day' ? (
                    <DaySeparator iso={item.iso} />
                  ) : (
                    <div
                      data-message-id={item.message.id}
                      className={cn(
                        highlightMessageId === item.message.id &&
                          'animate-[pulse_1s_ease-in-out_2] bg-amber-500/10'
                      )}
                    >
                      <MessageRow
                        message={item.message}
                        channelId={channelId}
                        myUserId={myUserId}
                        myDisplayName={myDisplayName}
                        perms={perms}
                        isPinned={pinnedSet?.has(item.message.id) ?? false}
                        showHeader={item.showHeader}
                        onReplyInThread={onReplyInThread}
                        onOptimisticReactionToggle={optimisticToggleReaction}
                        onOptimisticPatch={optimisticPatchMessage}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
