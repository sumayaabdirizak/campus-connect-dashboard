'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { getDiscussionSocket } from '../../api/socket'
import type { MessageReaction } from '../../api/types'
import {
  mergeMessages,
  unwrap,
  type ChannelMessagesState,
} from '../use-channel-messages/message-list-helpers'

export function useGroupDmSocketSync(
  validId: number | null,
  setState: Dispatch<SetStateAction<ChannelMessagesState>>
) {
  useEffect(() => {
    if (validId == null) return
    const socket = getDiscussionSocket()

    const onNew = (raw: unknown) => {
      const msg = unwrap(raw)
      if (!msg || Number(msg.groupDmId) !== validId) return
      setState((s) => ({ ...s, messages: mergeMessages(s.messages, [msg]) }))
    }
    const onEdit = (raw: unknown) => {
      const msg = unwrap(raw)
      if (!msg || Number(msg.groupDmId) !== validId) return
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === msg.id)
        if (idx < 0) return s
        const next = s.messages.slice()
        next[idx] = { ...next[idx], ...msg }
        return { ...s, messages: next }
      })
    }
    const onDelete = (payload: { messageId?: number; groupDmId?: number }) => {
      const messageId = Number(payload?.messageId)
      if (!Number.isFinite(messageId)) return
      if (payload?.groupDmId != null && Number(payload.groupDmId) !== validId) return
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId)
        if (idx < 0) return s
        const next = s.messages.slice()
        next[idx] = { ...next[idx], deletedAt: new Date().toISOString() }
        return { ...s, messages: next }
      })
    }
    const onReaction = (payload: {
      messageId?: number
      reactions?: MessageReaction[]
    }) => {
      const messageId = Number(payload?.messageId)
      if (!Number.isFinite(messageId)) return
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
