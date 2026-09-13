'use client'

import { useMemo, type ReactElement } from 'react'
import type { GroupDmMessagesStore } from '@/lib/discussions/services/use-group-dm-messages'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'
import { DaySeparator, isSameLocalDay } from '@/components/discussions/channel/day-separator'
import { DmMessageRow } from '@/components/discussions/dms/dm-message-row'

const HEADER_GAP_MS = 5 * 60 * 1000

function shouldShowHeader(
  prev: DiscussionMessage | null,
  current: DiscussionMessage
): boolean {
  if (!prev) return true
  if (Number(prev.senderId) !== Number(current.senderId)) return true
  if (!isSameLocalDay(prev.createdAt, current.createdAt)) return true
  const prevT = new Date(prev.createdAt).getTime()
  const curT = new Date(current.createdAt).getTime()
  if (!Number.isFinite(prevT) || !Number.isFinite(curT)) return true
  return curT - prevT > HEADER_GAP_MS
}

export function useDmMessageItems({
  messages,
  myUserId,
  myDisplayName,
  isOwner,
  isOneToOne,
  latestReadByOthers,
  optimisticPatchMessage,
  optimisticToggleReaction,
  onReply,
}: {
  messages: DiscussionMessage[]
  myUserId: number | null
  myDisplayName?: string | null
  isOwner: boolean
  isOneToOne?: boolean
  latestReadByOthers?: string | null
  optimisticPatchMessage: GroupDmMessagesStore['optimisticPatchMessage']
  optimisticToggleReaction: GroupDmMessagesStore['optimisticToggleReaction']
  onReply?: (message: DiscussionMessage) => void
}) {
  const latestMyMessageId = useMemo(() => {
    if (myUserId == null) return null
    // `messages` is chronologically ascending, so the last match is the newest.
    let found: string | null = null
    for (const m of messages) {
      if (!m.id.startsWith('temp-') && Number(m.senderId) === myUserId) found = m.id
    }
    return found
  }, [messages, myUserId])

  return useMemo(() => {
    const items: ReactElement[] = []
    let prev: DiscussionMessage | null = null
    for (const m of messages) {
      const showDay = !prev || !isSameLocalDay(prev.createdAt, m.createdAt)
      if (showDay) {
        items.push(<DaySeparator key={`day-${m.id}`} iso={m.createdAt} />)
      }
      const tick: 'seen' | 'sent' | null =
        latestMyMessageId != null && m.id === latestMyMessageId
          ? latestReadByOthers != null && latestReadByOthers === m.id
            ? 'seen'
            : 'sent'
          : null
      items.push(
        <DmMessageRow
          key={`msg-${m.id}`}
          message={m}
          myUserId={myUserId}
          myDisplayName={myDisplayName}
          isOwner={isOwner}
          showHeader={shouldShowHeader(prev, m)}
          hideIdentity={!!isOneToOne}
          onOptimisticPatch={optimisticPatchMessage}
          onOptimisticReactionToggle={optimisticToggleReaction}
          tickStatus={tick}
          onReply={onReply}
        />
      )
      prev = m
    }
    return items
  }, [
    messages,
    myUserId,
    myDisplayName,
    isOwner,
    isOneToOne,
    optimisticPatchMessage,
    optimisticToggleReaction,
    latestMyMessageId,
    latestReadByOthers,
    onReply,
  ])
}
