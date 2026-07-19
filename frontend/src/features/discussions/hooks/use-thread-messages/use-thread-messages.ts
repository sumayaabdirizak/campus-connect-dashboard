'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { listChannelMessages } from '../../api/service'
import { useReconnectGeneration } from '../use-reconnect-generation'
import type { DiscussionMessage } from '../../api/types'
import {
  compareByCreatedAt,
  DEFAULT_LIMIT,
  INITIAL_STATE,
  mergeReplies,
  type ThreadMessagesState,
} from './thread-message-helpers'
import { useThreadSocketSync } from './use-thread-socket-sync'

export function useThreadMessages(
  channelId: number | null | undefined,
  threadRootId: number | null | undefined,
  options: { limit?: number } = {}
) {
  const limit = options.limit ?? DEFAULT_LIMIT
  const validChannelId =
    Number.isFinite(Number(channelId)) && Number(channelId) > 0 ? Number(channelId) : null
  const validRootId =
    Number.isFinite(Number(threadRootId)) && Number(threadRootId) > 0
      ? Number(threadRootId)
      : null

  const [state, setState] = useState<ThreadMessagesState>(INITIAL_STATE)
  const requestSeqRef = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state
  const reconnectGen = useReconnectGeneration()

  useEffect(() => {
    if (validChannelId == null || validRootId == null) {
      setState(INITIAL_STATE)
      return
    }
    const seq = ++requestSeqRef.current
    setState((s) => ({ ...s, isLoading: true, error: null }))
    let cancelled = false
    void (async () => {
      try {
        const page = await listChannelMessages(validChannelId, {
          limit,
          threadRoot: validRootId,
        })
        if (cancelled || requestSeqRef.current !== seq) return
        const all = page.results ?? []
        const root = all.find((m) => m.id === validRootId) ?? null
        const replies = all
          .filter((m) => m.id !== validRootId && m.parentMessageId === validRootId)
          .toSorted(compareByCreatedAt)
        setState({
          root,
          replies,
          nextCursor: page.nextCursor ?? null,
          hasMore: Boolean(page.hasMore),
          isLoading: false,
          isLoadingOlder: false,
          error: null,
        })
      } catch (e) {
        if (cancelled || requestSeqRef.current !== seq) return
        setState({
          ...INITIAL_STATE,
          error: e instanceof Error ? e : new Error(String(e)),
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [validChannelId, validRootId, limit, reconnectGen])

  useThreadSocketSync(validChannelId, validRootId, setState)

  const loadOlder = useCallback(async () => {
    if (validChannelId == null || validRootId == null) return
    let started = false
    setState((s) => {
      if (s.isLoadingOlder || !s.hasMore || !s.nextCursor) return s
      started = true
      return { ...s, isLoadingOlder: true }
    })
    if (!started) return

    const seq = requestSeqRef.current
    try {
      const cursor = stateRef.current.nextCursor
      const page = await listChannelMessages(validChannelId, {
        limit,
        threadRoot: validRootId,
        cursor,
      })
      if (requestSeqRef.current !== seq) return
      const older = (page.results ?? []).filter(
        (m) => m.id !== validRootId && m.parentMessageId === validRootId
      )
      setState((s) => ({
        ...s,
        replies: mergeReplies(s.replies, older),
        nextCursor: page.nextCursor ?? null,
        hasMore: Boolean(page.hasMore),
        isLoadingOlder: false,
        error: null,
      }))
    } catch (e) {
      if (requestSeqRef.current !== seq) return
      setState((s) => ({
        ...s,
        isLoadingOlder: false,
        error: e instanceof Error ? e : new Error(String(e)),
      }))
    }
  }, [validChannelId, validRootId, limit])

  const addOptimisticReply = useCallback((temp: DiscussionMessage) => {
    setState((s) => ({ ...s, replies: mergeReplies(s.replies, [temp]) }))
  }, [])

  const replaceOptimisticReply = useCallback((tempId: number, real: DiscussionMessage) => {
      setState((s) => {
        const filtered = s.replies.filter((m) => m.id !== tempId)
        return { ...s, replies: mergeReplies(filtered, [real]) }
      })
    },
    []
  )

  const removeOptimisticReply = useCallback((tempId: number) => {
    setState((s) => ({ ...s, replies: s.replies.filter((m) => m.id !== tempId) }))
  }, [])

  return {
    root: state.root,
    replies: state.replies,
    isLoading: state.isLoading,
    isLoadingOlder: state.isLoadingOlder,
    hasMore: state.hasMore,
    error: state.error,
    loadOlder,
    addOptimisticReply,
    replaceOptimisticReply,
    removeOptimisticReply,
  }
}
