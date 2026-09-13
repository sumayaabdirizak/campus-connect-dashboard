'use client';

import { Button } from '@/features/ui/components/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/features/ui/components/skeleton';
import { useThreadMessages } from '@/lib/discussions/services/use-thread-messages';
import { useChannelRoom } from '@/lib/discussions/services/use-discussion-room';
import { MessageRow } from '@/components/discussions/channel/message-row';
import { MessageComposer } from '@/components/discussions/composer/message-composer';
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions';
import { useThreadPanelScroll } from './use-thread-panel-scroll';
import { ThreadRepliesList } from './thread-replies-list';

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
  channelId: string;
  threadRootId: string;
  channelName?: string;
  myUserId: number | null;
  myDisplayName?: string | null;
  perms: DiscussionPermissions;
  pinnedSet?: ReadonlySet<string>;
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

  const { scrollRef, sentinelRef } = useThreadPanelScroll({
    threadRootId,
    root,
    repliesLength: replies.length,
    hasMore,
    isLoadingOlder,
    loadOlder,
  });

  return (
    <aside
      aria-label='Thread'
      className='flex h-full w-full min-w-0 flex-col overflow-x-clip overflow-y-hidden bg-background'
    >
      <header className='flex h-12 min-w-0 shrink-0 items-center justify-between gap-2 border-b px-3'>
        <div className='min-w-0 flex-1 overflow-hidden'>
          <div className='truncate text-sm font-semibold'>Thread</div>
          {channelName ? (
            <div className='truncate text-xs text-muted-foreground'>#{channelName}</div>
          ) : null}
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-8 w-8 shrink-0'
          aria-label='Close thread'
          onClick={onClose}
        >
          <Icons.close className='h-4 w-4' />
        </Button>
      </header>

      <div
        ref={scrollRef}
        className='relative min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto bg-card py-1.5'
      >
        {isLoading && !root ? (
          <div className='space-y-4 px-3 py-4'>
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

            <div className='border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
              {replies.length === 0
                ? 'No replies yet'
                : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </div>

            <ThreadRepliesList
              replies={replies}
              channelId={channelId}
              myUserId={myUserId}
              perms={perms}
              pinnedSet={pinnedSet}
            />
          </>
        )}
      </div>

      <div className='min-w-0 shrink-0 overflow-hidden'>
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
      </div>
    </aside>
  );
}
