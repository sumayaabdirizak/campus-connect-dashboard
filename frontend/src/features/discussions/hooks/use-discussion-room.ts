/**
 * Joins a socket room while a component is mounted, then leaves on unmount.
 *
 * Refcounted under the hood (see api/socket.ts) so multiple components can
 * subscribe to the same channel without stomping each other.
 */

'use client';

import { useEffect } from 'react';
import { joinRoom, leaveRoom, type RoomKey } from '../api/socket';

export function useDiscussionRoom(room: RoomKey | null | undefined) {
  useEffect(() => {
    if (!room) return;
    joinRoom(room);
    return () => {
      leaveRoom(room);
    };
  }, [room]);
}

export function useChannelRoom(channelId: number | null | undefined) {
  const room: RoomKey | null =
    Number.isFinite(Number(channelId)) && Number(channelId) > 0
      ? (`channel:${Number(channelId)}` as RoomKey)
      : null;
  useDiscussionRoom(room);
}

export function useGroupDmRoom(groupDmId: number | null | undefined) {
  const room: RoomKey | null =
    Number.isFinite(Number(groupDmId)) && Number(groupDmId) > 0
      ? (`groupdm:${Number(groupDmId)}` as RoomKey)
      : null;
  useDiscussionRoom(room);
}

/** Subscribe to a server-wide room — receives `presence:update` events for
 *  every member of this server. Refcounted so multiple components in the
 *  same server share one socket-side join. */
export function useDiscussionServerRoom(serverId: number | null | undefined) {
  const room: RoomKey | null =
    Number.isFinite(Number(serverId)) && Number(serverId) > 0
      ? (`discussion:${Number(serverId)}` as RoomKey)
      : null;
  useDiscussionRoom(room);
}
