'use client'

import { cn } from '@/lib/utils'
import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual'
import type { ChannelMessagesStore } from '@/lib/discussions/services/use-channel-messages'
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions'
import { DaySeparator } from '@/components/discussions/channel/day-separator'
import { MessageRow } from '@/components/discussions/channel/message-row'
import type { ListItem } from './message-list-helpers'

export function MessageListVirtualBody({
  items,
  virtualizer,
  virtualItems,
  totalSize,
  channelId,
  myUserId,
  myDisplayName,
  perms,
  pinnedSet,
  onReplyInThread,
  onQuoteReply,
  onJumpToReply,
  highlightMessageId,
  optimisticToggleReaction,
  optimisticPatchMessage,
}: {
  items: ListItem[]
  virtualizer: Virtualizer<HTMLDivElement, Element>
  virtualItems: VirtualItem[]
  totalSize: number
  channelId: string
  myUserId: number | null
  myDisplayName?: string | null
  perms: DiscussionPermissions
  pinnedSet?: ReadonlySet<string>
  onReplyInThread?: (messageId: string) => void
  onQuoteReply?: (message: import('@/lib/discussions/queries/types').DiscussionMessage) => void
  onJumpToReply?: (messageId: string) => void
  highlightMessageId?: string | null
  optimisticToggleReaction: ChannelMessagesStore['optimisticToggleReaction']
  optimisticPatchMessage: ChannelMessagesStore['optimisticPatchMessage']
}) {
  return (
    <div style={{ height: `${totalSize}px`, position: 'relative' }} className='pb-2'>
      {virtualItems.map((vi) => {
        const item = items[vi.index]
        if (!item) return null
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
              transform: `translateY(${vi.start}px)`,
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
                  onQuoteReply={onQuoteReply}
                  onJumpToReply={onJumpToReply}
                  onOptimisticReactionToggle={optimisticToggleReaction}
                  onOptimisticPatch={optimisticPatchMessage}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
