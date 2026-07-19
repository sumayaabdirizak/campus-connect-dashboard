'use client'

import { useMemo, type ReactElement } from 'react'
import type { GroupDmMessagesStore } from '../../../hooks/use-group-dm-messages'
import type { DiscussionMessage } from '../../../api/types'
import { DaySeparator, isSameLocalDay } from '../../channel/day-separator'
import { DmMessageRow } from '../dm-message-row'

export function useDmMessageItems({
  messages,
  myUserId,
  myDisplayName,
  isOwner,
  latestReadByOthers,
  optimisticPatchMessage,
  optimisticToggleReaction,
}: {
  messages: DiscussionMessage[]
  myUserId: number | null
  myDisplayName?: string | null
  isOwner: boolean
  latestReadByOthers?: number | null
  optimisticPatchMessage: GroupDmMessagesStore['optimisticPatchMessage']
  optimisticToggleReaction: GroupDmMessagesStore['optimisticToggleReaction']
}) {
  const latestMyMessageId = useMemo(() => {
    if (myUserId == null) return null
    let max = 0
    for (const m of messages) {
      if (m.id > 0 && Number(m.senderId) === myUserId && m.id > max) max = m.id
    }
    return max > 0 ? max : null
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
          ? latestReadByOthers != null && latestReadByOthers >= m.id
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
          showHeader
          onOptimisticPatch={optimisticPatchMessage}
          onOptimisticReactionToggle={optimisticToggleReaction}
          tickStatus={tick}
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
    optimisticPatchMessage,
    optimisticToggleReaction,
    latestMyMessageId,
    latestReadByOthers,
  ])
}
