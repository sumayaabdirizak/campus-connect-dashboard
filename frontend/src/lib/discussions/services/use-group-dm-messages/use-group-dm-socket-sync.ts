'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { getDiscussionSocket } from '@/lib/discussions/queries/socket'
import type { MessageReaction } from '@/lib/discussions/queries/types'
import {
  discussionIdsEqual,
  mergeMessages,
  unwrap,
  type ChannelMessagesState,
} from '../use-channel-messages/message-list-helpers'

export function useGroupDmSocketSync(
  validId: string | null,
  setState: Dispatch<SetStateAction<ChannelMessagesState>>
) {
  useEffect(() => {
    if (validId == null) return
    const socket = getDiscussionSocket()

    const onNew = (raw: unknown) => {
      const msg = unwrap(raw)
      if (!msg || !discussionIdsEqual(msg.groupDmId, validId)) return
      setState((s) => ({ ...s, messages: mergeMessages(s.messages, [msg]) }))
    }
    const onEdit = (raw: unknown) => {
      const msg = unwrap(raw)
      if (!msg || !discussionIdsEqual(msg.groupDmId, validId)) return
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === msg.id)
        if (idx < 0) return s
        const next = s.messages.slice()
        next[idx] = { ...next[idx], ...msg }
        return { ...s, messages: next }
      })
    }
    const onDelete = (payload: { messageId?: string; groupDmId?: string }) => {
      const messageId = payload?.messageId
      if (!messageId) return
      const groupDmId = payload?.groupDmId ? String(payload.groupDmId) : null
      if (groupDmId != null && !discussionIdsEqual(groupDmId, validId)) return
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId)
        if (idx < 0) return s
        const next = s.messages.slice()
        next[idx] = { ...next[idx], deletedAt: new Date().toISOString() }
        return { ...s, messages: next }
      })
    }
    const onReaction = (payload: {
      messageId?: string
      reactions?: MessageReaction[]
    }) => {
      const messageId = payload?.messageId
      if (!messageId) return
      if (!Array.isArray(payload?.reactions)) return
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId)
        if (idx < 0) return s
        const next = s.messages.slice()
        next[idx] = { ...next[idx], reactions: payload.reactions }
        return { ...s, messages: next }
      })
    }

    socket.on('message:new', onNew)
    socket.on('groupdm:message:new', onNew)
    socket.on('message:edit', onEdit)
    socket.on('message:edited', onEdit)
    socket.on('message:delete', onDelete)
    socket.on('message:deleted', onDelete)
    socket.on('reaction:update', onReaction)

    return () => {
      socket.off('message:new', onNew)
      socket.off('groupdm:message:new', onNew)
      socket.off('message:edit', onEdit)
      socket.off('message:edited', onEdit)
      socket.off('message:delete', onDelete)
      socket.off('message:deleted', onDelete)
      socket.off('reaction:update', onReaction)
    }
  }, [validId, setState])
}
