'use client'

import { Icons } from '@/components/icons'
import type { GroupDmMessagesStore } from '../../../hooks/use-group-dm-messages'
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
  store,
  latestReadByOthers,
}: {
  groupDmId: number
  myUserId: number | null
  myDisplayName?: string | null
  isOwner: boolean
  store: GroupDmMessagesStore
  latestReadByOthers?: number | null
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
    latestReadByOthers,
    optimisticPatchMessage,
    optimisticToggleReaction,
  })

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
