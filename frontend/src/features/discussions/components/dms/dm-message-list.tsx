'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactElement } from 'react';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { GroupDmMessagesStore } from '../../hooks/use-group-dm-messages';
import type { DiscussionMessage } from '../../api/types';
import { DaySeparator, isSameLocalDay } from '../channel/day-separator';
import { DmMessageRow } from './dm-message-row';

const SCROLL_BOTTOM_THRESHOLD = 120;

export function DmMessageList({
  groupDmId,
  myUserId,
  myDisplayName,
  isOwner,
  store,
  latestReadByOthers
}: {
  groupDmId: number;
  myUserId: number | null;
  myDisplayName?: string | null;
  isOwner: boolean;
  /** Lifted store so the composer can drive optimistic inserts. */
  store: GroupDmMessagesStore;
  /** Highest messageId read by any other member — drives the "seen" tick
   *  on the latest message YOU sent that's at or below this id. */
  latestReadByOthers?: number | null;
}) {
  const {
    messages,
    isLoading,
    isLoadingOlder,
    hasMore,
    loadOlder,
    error,
    optimisticPatchMessage,
    optimisticToggleReaction
  } = store;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const lastScrollHeightRef = useRef(0);
  const lastTopMessageIdRef = useRef<number | null>(null);
  const initialScrollDoneRef = useRef(false);

  useLayoutEffect(() => {
    if (initialScrollDoneRef.current) return;
    if (messages.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    initialScrollDoneRef.current = true;
    lastScrollHeightRef.current = el.scrollHeight;
    lastTopMessageIdRef.current = messages[0]?.id ?? null;
  }, [messages]);

  useEffect(() => {
    initialScrollDoneRef.current = false;
    wasAtBottomRef.current = true;
    lastScrollHeightRef.current = 0;
    lastTopMessageIdRef.current = null;
  }, [groupDmId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!initialScrollDoneRef.current) return;
    const newTopId = messages[0]?.id ?? null;
    if (
      newTopId !== null &&
      lastTopMessageIdRef.current !== null &&
      newTopId !== lastTopMessageIdRef.current
    ) {
      const delta = el.scrollHeight - lastScrollHeightRef.current;
      if (delta > 0) el.scrollTop = el.scrollTop + delta;
    } else if (wasAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    lastScrollHeightRef.current = el.scrollHeight;
    lastTopMessageIdRef.current = newTopId;
  }, [messages]);

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
      { root, rootMargin: '120px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingOlder, loadOlder]);

  // Latest of YOUR messages (excluding optimistic temps with id<0). If
  // `latestReadByOthers` is at or above it, render a "Seen" tick on that
  // row. Otherwise render "Sent". Skipped entirely if you have no messages.
  const latestMyMessageId = useMemo(() => {
    if (myUserId == null) return null;
    let max = 0;
    for (const m of messages) {
      if (m.id > 0 && Number(m.senderId) === myUserId && m.id > max) max = m.id;
    }
    return max > 0 ? max : null;
  }, [messages, myUserId]);

  const rendered = useMemo(() => {
    const items: ReactElement[] = [];
    let prev: DiscussionMessage | null = null;
    for (const m of messages) {
      const showDay = !prev || !isSameLocalDay(prev.createdAt, m.createdAt);
      if (showDay) {
        items.push(<DaySeparator key={`day-${m.id}`} iso={m.createdAt} />);
      }
      // Tick state only on the latest message you sent.
      const tick: 'seen' | 'sent' | null =
        latestMyMessageId != null && m.id === latestMyMessageId
          ? latestReadByOthers != null && latestReadByOthers >= m.id
            ? 'seen'
            : 'sent'
          : null;
      items.push(
        <DmMessageRow
          key={`msg-${m.id}`}
          message={m}
          myUserId={myUserId}
          myDisplayName={myDisplayName}
          isOwner={isOwner}
          showHeader
          onOptimisticPatch={optimisticPatchMessage}
          onOptimisticReactionToggle={optimisticToggleReaction}
          tickStatus={tick}
        />
      );
      prev = m;
    }
    return items;
  }, [
    messages,
    myUserId,
    myDisplayName,
    isOwner,
    optimisticPatchMessage,
    optimisticToggleReaction,
    latestMyMessageId,
    latestReadByOthers
  ]);

  return (
    <div
      ref={scrollRef}
      className='relative flex-1 overflow-y-auto bg-muted/40'
      style={{
        backgroundImage:
          'radial-gradient(rgba(130,130,130,0.07) 1px, transparent 1px)',
        backgroundSize: '22px 22px'
      }}
    >
      <div ref={sentinelRef} className='h-1' aria-hidden />

      {isLoadingOlder && (
        <div className='flex items-center justify-center py-2'>
          <Icons.spinner className='h-4 w-4 animate-spin text-muted-foreground' />
        </div>
      )}

      {!hasMore && initialScrollDoneRef.current && messages.length > 0 && (
        <div className='m-auto max-w-md px-6 py-6 text-center text-muted-foreground'>
          <Icons.teams className='mx-auto h-8 w-8 opacity-60' />
          <p className='mt-2 text-sm font-medium'>This is the start of your conversation</p>
        </div>
      )}

      {isLoading && messages.length === 0 ? (
        <div className='space-y-4 px-6 py-6'>
          {[0, 1, 2].map((i) => (
            <div key={i} className='flex gap-3'>
              <Skeleton className='h-9 w-9 shrink-0 rounded-full' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-4 w-3/4' />
              </div>
            </div>
          ))}
        </div>
      ) : error && messages.length === 0 ? (
        <div className='flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground'>
          <Icons.warning className='h-10 w-10 text-destructive/70' />
          <p className='text-sm font-medium text-foreground'>Couldn’t load messages</p>
          <p className='max-w-md break-words text-xs'>{error.message}</p>
        </div>
      ) : messages.length === 0 ? (
        <div className={cn('flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground')}>
          <Icons.teams className='h-10 w-10 opacity-60' />
          <p className='text-sm font-medium'>No messages yet</p>
          <p className='text-xs'>Send the first message to get the conversation started.</p>
        </div>
      ) : (
        <div className='pb-2'>{rendered}</div>
      )}
    </div>
  );
}
