'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { getDiscussionSocket } from '@/lib/discussions/queries/socket'
import type { MessageReaction } from '@/lib/discussions/queries/types'
import { mergeReplies, unwrap, type ThreadMessagesState } from './thread-message-helpers'

export function useThreadSocketSync(
  validChannelId: number | null,
  validRootId: number | null,
  setState: Dispatch<SetStateAction<ThreadMessagesState>>
) {
  useEffect(() => {
    if (validChannelId == null || validRootId == null) return
    const socket = getDiscussionSocket()

    const onNew = (raw: unknown) => {
      const msg = unwrap(raw)
      if (!msg || Number(msg.channelId) !== validChannelId) return
      if (Number(msg.parentMessageId) !== validRootId) return
      setState((s) => ({ ...s, replies: mergeReplies(s.replies, [msg]) }))
    }
    const onEdit = (raw: unknown) => {
      const msg = unwrap(raw)
      if (!msg) return
      setState((s) => {
        if (msg.id === validRootId) {
          return { ...s, root: s.root ? { ...s.root, ...msg } : msg }
        }
        const idx = s.replies.findIndex((x) => x.id === msg.id)
        if (idx < 0) return s
        const next = s.replies.slice()
        next[idx] = { ...next[idx], ...msg }
        return { ...s, replies: next }
      })
    }
    const onDelete = (payload: { messageId?: number }) => {
      const messageId = Number(payload?.messageId)
      if (!Number.isFinite(messageId)) return
      setState((s) => {
        if (messageId === validRootId && s.root) {
          return { ...s, root: { ...s.root, deletedAt: new Date().toISOString() } }
        }
        const idx = s.replies.findIndex((x) => x.id === messageId)
        if (idx < 0) return s
        const next = s.replies.slice()
        next[idx] = { ...next[idx], deletedAt: new Date().toISOString() }
        return { ...s, replies: next }
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
        if (messageId === validRootId && s.root) {
          return { ...s, root: { ...s.root, reactions: payload.reactions } }
        }
        const idx = s.replies.findIndex((x) => x.id === messageId)
        if (idx < 0) return s
        const next = s.replies.slice()
        next[idx] = { ...next[idx], reactions: payload.reactions }
        return { ...s, replies: next }
      })
    }

    socket.on('message:new', onNew)
    socket.on('discussion:message:new', onNew)
    socket.on('message:edit', onEdit)
    socket.on('message:edited', onEdit)
    socket.on('message:delete', onDelete)
    socket.on('message:deleted', onDelete)
    socket.on('reaction:update', onReaction)

    return () => {
      socket.off('message:new', onNew)
      socket.off('discussion:message:new', onNew)
      socket.off('message:edit', onEdit)
      socket.off('message:edited', onEdit)
      socket.off('message:delete', onDelete)
      socket.off('message:deleted', onDelete)
      socket.off('reaction:update', onReaction)
    }
  }, [validChannelId, validRootId, setState])
}
