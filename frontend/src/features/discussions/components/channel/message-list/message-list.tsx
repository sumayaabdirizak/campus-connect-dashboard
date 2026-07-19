'use client'

import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Icons } from '@/components/icons'
import type { ChannelMessagesStore } from '../../../hooks/use-channel-messages'
import type { DiscussionPermissions } from '../../../hooks/use-discussion-permissions'
import {
  buildItems,
  ESTIMATED_ROW_HEIGHT,
} from './message-list-helpers'
import {
  MessageListBeginning,
  MessageListEmpty,
  MessageListError,
  MessageListLoading,
} from './message-list-states'
import { MessageListVirtualBody } from './message-list-virtual-body'
import { useMessageListScroll } from './use-message-list-scroll'

export function MessageList({
  channelId,
  myUserId,
  myDisplayName,
  perms,
  channelName,
  pinnedSet,
  onReplyInThread,
  highlightMessageId,
  store,
}: {
  channelId: number
  myUserId: number | null
  myDisplayName?: string | null
  perms: DiscussionPermissions
  channelName?: string
  pinnedSet?: ReadonlySet<number>
  onReplyInThread?: (messageId: number) => void
  highlightMessageId?: number | null
  store: ChannelMessagesStore
}) {
  const {
    messages,
    isLoading,
    isLoadingOlder,
    hasMore,
    loadOlder,
    error,
    optimisticToggleReaction,
    optimisticPatchMessage,
  } = store

  const items = useMemo(() => buildItems(messages), [messages])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => items[index]?.key ?? index,
  })

  const { sentinelRef, initialScrollDoneRef } = useMessageListScroll({
    channelId,
    scrollRef,
    items,
    virtualizer,
    highlightMessageId,
    hasMore,
    isLoadingOlder,
    loadOlder,
  })

  const totalSize = virtualizer.getTotalSize()
  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={scrollRef}
      className='relative flex-1 overflow-y-auto bg-muted/40'
      style={{
        backgroundImage:
          'radial-gradient(rgba(130,130,130,0.07) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      {isLoading && items.length === 0 ? (
        <MessageListLoading />
      ) : error && items.length === 0 ? (
        <MessageListError channelId={channelId} message={error.message} />
      ) : items.length === 0 ? (
        <MessageListEmpty channelName={channelName} />
      ) : (
        <>
          <div ref={sentinelRef} className='h-1' aria-hidden />
          {isLoadingOlder && (
            <div className='flex items-center justify-center py-2'>
              <Icons.spinner className='h-4 w-4 animate-spin text-muted-foreground' />
            </div>
          )}
          {!hasMore && initialScrollDoneRef.current && (
            <MessageListBeginning channelName={channelName} />
          )}
          <MessageListVirtualBody
            items={items}
            virtualizer={virtualizer}
            virtualItems={virtualItems}
            totalSize={totalSize}
            channelId={channelId}
            myUserId={myUserId}
            myDisplayName={myDisplayName}
            perms={perms}
            pinnedSet={pinnedSet}
            onReplyInThread={onReplyInThread}
            highlightMessageId={highlightMessageId}
            optimisticToggleReaction={optimisticToggleReaction}
            optimisticPatchMessage={optimisticPatchMessage}
          />
        </>
      )}
    </div>
  )
}
