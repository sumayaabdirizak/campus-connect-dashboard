'use client'

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { getDiscussionSocket } from '@/lib/discussions/queries/socket'
import type { MessageReaction } from '@/lib/discussions/queries/types'
import {
  discussionIdsEqual,
  isMainThreadMessage,
  mergeMessages,
  unwrap,
  type ChannelMessagesState,
} from '../use-channel-messages/message-list-helpers'

function matchesOpenChannel(
  msgChannelId: string | number | null | undefined,
  openIds: Array<string | null>
) {
  return openIds.some((id) => id != null && discussionIdsEqual(msgChannelId, id))
}

export function useChannelSocketSync(
  validId: string | null,
  setState: Dispatch<SetStateAction<ChannelMessagesState>>,
  /** Extra ids that identify the same channel (e.g. publicId when URL still has legacy int). */
  alternateChannelIds: Array<string | null | undefined> = []
) {
  // Keep alternates in a ref so the effect dependency list stays a fixed length
  // (React Compiler / Fast Refresh warn if deps array size changes).
  const alternatesRef = useRef<string[]>([])
  alternatesRef.current = alternateChannelIds
    .filter((id): id is string | number => id != null && String(id).trim() !== '')
    .map((id) => String(id))

  useEffect(() => {
    if (validId == null) return
    const socket = getDiscussionSocket()

    const openIds = (): Array<string | null> => [validId, ...alternatesRef.current]

    const onNew = (raw: unknown) => {
      const msg = unwrap(raw)
      if (!msg || !matchesOpenChannel(msg.channelId, openIds())) return
      if (isMainThreadMessage(msg)) {
        setState((s) => {
          const withoutTemps = s.messages.filter((m) => {
            if (!String(m.id).startsWith('temp-')) return true
            if (msg.senderId == null || m.senderId == null) return true
            if (Number(m.senderId) !== Number(msg.senderId)) return true
            return (m.content ?? '') !== (msg.content ?? '')
          })
          return { ...s, messages: mergeMessages(withoutTemps, [msg]) }
        })
        return
      }
      const parentId = msg.parentMessageId
      if (!parentId) return
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === parentId)
        if (idx < 0) return s
        const next = s.messages.slice()
        const parent = next[idx]
        const prevPreview = parent.threadPreview ?? {
          replyCount: 0,
          lastReplyAt: null,
          previewSenders: [],
        }
        const senderEntry = msg.isAnonymous
          ? { id: 0, full_name: 'Anonymous' }
          : (msg.sender ?? null)
        const senders = senderEntry
          ? [
              senderEntry,
              ...prevPreview.previewSenders.filter(
                (p) => p.id !== senderEntry.id || p.full_name !== senderEntry.full_name
              ),
            ].slice(0, 3)
          : prevPreview.previewSenders
        next[idx] = {
          ...parent,
          threadPreview: {
            replyCount: prevPreview.replyCount + 1,
            lastReplyAt: msg.createdAt,
            previewSenders: senders,
          },
        }
        return { ...s, messages: next }
      })
    }

    const onEdit = (raw: unknown) => {
      const msg = unwrap(raw)
      if (!msg || !matchesOpenChannel(msg.channelId, openIds())) return
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === msg.id)
        if (idx < 0) return s
        const next = s.messages.slice()
        next[idx] = { ...next[idx], ...msg }
        return { ...s, messages: next }
      })
    }

    const onDelete = (payload: { messageId?: string; channelId?: string }) => {
      const messageId = payload?.messageId
      if (!messageId) return
      const channelId = payload?.channelId ? String(payload.channelId) : null
      if (channelId != null && !matchesOpenChannel(channelId, openIds())) return
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId)
        if (idx < 0) return s
        const next = s.messages.slice()
        next[idx] = { ...next[idx], deletedAt: new Date().toISOString() }
        return { ...s, messages: next }
      })
    }

    const onReaction = (payload: { messageId?: string; reactions?: MessageReaction[] }) => {
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
  }, [validId, setState])
}
