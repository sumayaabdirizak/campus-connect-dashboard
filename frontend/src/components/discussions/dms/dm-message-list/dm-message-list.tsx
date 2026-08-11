'use client'

import { Icons } from '@/components/icons'
import type { GroupDmMessagesStore } from '@/lib/discussions/services/use-group-dm-messages'
import {
  DmMessageListBeginning,
  DmMessageListEmpty,
  DmMessageListError,
  DmMessageListLoading,
} from './dm-message-list-states'
import { useDmMessageItems } from './use-dm-message-items'
import { useDmMessageScroll } from './use-dm-message-scroll'

export function DmMessageList({
  groupDmId,
  myUserId,
  myDisplayName,
  isOwner,
  isOneToOne,
  store,
  latestReadByOthers,
  onReply,
}: {
  groupDmId: string
  myUserId: number | null
  myDisplayName?: string | null
  isOwner: boolean
  isOneToOne?: boolean
  store: GroupDmMessagesStore
  latestReadByOthers?: string | null
  onReply?: (message: import('@/lib/discussions/queries/types').DiscussionMessage) => void
}) {
  const {
    messages,
    isLoading,
    isLoadingOlder,
    hasMore,
    loadOlder,
    error,
    optimisticPatchMessage,
    optimisticToggleReaction,
  } = store

  const { scrollRef, sentinelRef, initialScrollDoneRef } = useDmMessageScroll({
    groupDmId,
    messages,
    hasMore,
    isLoadingOlder,
    loadOlder,
  })

  const rendered = useDmMessageItems({
    messages,
    myUserId,
    myDisplayName,
    isOwner,
    isOneToOne,
    latestReadByOthers,
    optimisticPatchMessage,
    optimisticToggleReaction,
    onReply,
  })

  return (
    <div
      ref={scrollRef}
      className='relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-white'
    >
      <div ref={sentinelRef} className='h-1' aria-hidden />

      {isLoadingOlder && (
        <div className='flex items-center justify-center py-2'>
          <Icons.spinner className='h-4 w-4 animate-spin text-muted-foreground' />
        </div>
      )}

      {!hasMore && initialScrollDoneRef.current && messages.length > 0 && (
        <DmMessageListBeginning />
      )}

      {isLoading && messages.length === 0 ? (
        <DmMessageListLoading />
      ) : error && messages.length === 0 ? (
        <DmMessageListError message={error.message} />
      ) : messages.length === 0 ? (
        <DmMessageListEmpty />
      ) : (
        <div className='pb-2'>{rendered}</div>
      )}
    </div>
  )
}
