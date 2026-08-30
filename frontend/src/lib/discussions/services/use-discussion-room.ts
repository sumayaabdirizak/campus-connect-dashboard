'use client'

import { useEffect } from 'react'
import { joinRoom, leaveRoom, type RoomKey } from '../queries/socket'
import { asDiscussionId } from './use-channel-messages/message-list-helpers'

export function useDiscussionRoom(room: RoomKey | null | undefined) {
  useEffect(() => {
    if (!room) return
    joinRoom(room)
    return () => {
      leaveRoom(room)
    }
  }, [room])
}

export function useChannelRoom(channelId: string | number | null | undefined) {
  const id = asDiscussionId(channelId)
  const room: RoomKey | null = id ? (`channel:${id}` as RoomKey) : null
  useDiscussionRoom(room)
}

export function useGroupDmRoom(groupDmId: string | number | null | undefined) {
  const id = asDiscussionId(groupDmId)
  const room: RoomKey | null = id ? (`groupdm:${id}` as RoomKey) : null
  useDiscussionRoom(room)
}

/** Subscribe to a server-wide room — receives `presence:update` events for
 *  every member of this server. Refcounted so multiple components in the
 *  same server share one socket-side join. */
export function useDiscussionServerRoom(serverId: string | number | null | undefined) {
  const id = asDiscussionId(serverId)
  const room: RoomKey | null = id ? (`discussion:${id}` as RoomKey) : null
  useDiscussionRoom(room)
}
