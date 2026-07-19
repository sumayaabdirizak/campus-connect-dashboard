'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { DiscussionMessage, MessageReaction } from '../../api/types'
import { mergeMessages, type ChannelMessagesState } from './message-list-helpers'

export function useChannelOptimistic(
  setState: Dispatch<SetStateAction<ChannelMessagesState>>
) {
  const addOptimisticMessage = useCallback((temp: DiscussionMessage) => {
    setState((s) => ({ ...s, messages: mergeMessages(s.messages, [temp]) }))
  }, [setState])

  const replaceOptimisticMessage = useCallback(
    (tempId: number, real: DiscussionMessage) => {
      setState((s) => {
        const filtered = s.messages.filter((m) => m.id !== tempId)
        return { ...s, messages: mergeMessages(filtered, [real]) }
      })
    },
    [setState]
  )

  const removeOptimisticMessage = useCallback(
    (tempId: number) => {
      setState((s) => ({
        ...s,
        messages: s.messages.filter((m) => m.id !== tempId),
      }))
    },
    [setState]
  )

  const optimisticPatchMessage = useCallback(
    (messageId: number, patch: Partial<DiscussionMessage>): (() => void) => {
      let snapshot: Partial<DiscussionMessage> | null = null
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId)
        if (idx < 0) return s
        const msg = s.messages[idx]
        const snap: Partial<DiscussionMessage> = {}
        for (const k of Object.keys(patch) as (keyof DiscussionMessage)[]) {
          ;(snap as Record<string, unknown>)[k as string] = (msg as Record<string, unknown>)[
            k as string
          ]
        }
        snapshot = snap
        const next = s.messages.slice()
        next[idx] = { ...msg, ...patch }
        return { ...s, messages: next }
      })
      return () => {
        if (!snapshot) return
        setState((s) => {
          const idx = s.messages.findIndex((x) => x.id === messageId)
          if (idx < 0) return s
          const next = s.messages.slice()
          next[idx] = {
            ...next[idx],
            ...(snapshot as Partial<DiscussionMessage>),
          }
          return { ...s, messages: next }
        })
      }
    },
    [setState]
  )

  const optimisticToggleReaction = useCallback(
    (
      messageId: number,
      emoji: string,
      myUserId: number,
      myDisplayName: string
    ): { wasAdding: boolean } => {
      let wasAdding = false
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId)
        if (idx < 0) return s
        const msg = s.messages[idx]
        const reactions = msg.reactions ?? []
        const mineIdx = reactions.findIndex(
          (r) => Number(r.userId) === myUserId && r.emoji === emoji
        )
        const nextReactions: MessageReaction[] =
          mineIdx >= 0
            ? reactions.filter((_, i) => i !== mineIdx)
            : [
                ...reactions,
                {
                  id: -Date.now(),
                  messageId,
                  userId: myUserId,
                  emoji,
                  createdAt: new Date().toISOString(),
                  user: { id: myUserId, full_name: myDisplayName },
                },
              ]
        wasAdding = mineIdx < 0
        const next = s.messages.slice()
        next[idx] = { ...msg, reactions: nextReactions }
        return { ...s, messages: next }
      })
      return { wasAdding }
    },
    [setState]
  )

  return {
    addOptimisticMessage,
    replaceOptimisticMessage,
    removeOptimisticMessage,
    optimisticPatchMessage,
    optimisticToggleReaction,
  }
}
