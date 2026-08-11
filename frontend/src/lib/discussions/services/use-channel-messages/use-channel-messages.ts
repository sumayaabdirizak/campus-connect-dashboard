'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { listChannelMessages } from '@/lib/discussions/queries/service'
import { useChannelRoom } from '../use-discussion-room'
import { useReconnectGeneration } from '../use-reconnect-generation'
import {
  compareByCreatedAt,
  DEFAULT_LIMIT,
  INITIAL_STATE,
  isMainThreadMessage,
  mergeMessages,
  type ChannelMessagesState,
} from './message-list-helpers'
import { useChannelOptimistic } from './use-channel-optimistic'
import { useChannelSocketSync } from './use-channel-socket-sync'

export function useChannelMessages(
  channelId: number | null | undefined,
  options: { limit?: number } = {}
) {
  const limit = options.limit ?? DEFAULT_LIMIT
  const validId =
    Number.isFinite(Number(channelId)) && Number(channelId) > 0 ? Number(channelId) : null

  useChannelRoom(validId)
  const reconnectGen = useReconnectGeneration()

  const [state, setState] = useState<ChannelMessagesState>(INITIAL_STATE)
  const requestSeqRef = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (validId == null) {
      setState(INITIAL_STATE)
      return
    }
    const seq = ++requestSeqRef.current
    setState((s) => ({ ...s, isLoading: true, error: null }))
    let cancelled = false
    void (async () => {
      try {
        const page = await listChannelMessages(String(validId), { limit })
        if (cancelled || requestSeqRef.current !== seq) return
        const main = (page.results ?? []).filter(isMainThreadMessage)
        setState({
          messages: main.toSorted(compareByCreatedAt),
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
  }, [validId, limit, reconnectGen])

  useChannelSocketSync(validId, setState)
  const optimistic = useChannelOptimistic(setState)

  const loadOlder = useCallback(async () => {
    if (validId == null) return
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
      const page = await listChannelMessages(String(validId), { limit, cursor })
      if (requestSeqRef.current !== seq) return
      const older = (page.results ?? []).filter(isMainThreadMessage)
      setState((s) => ({
        ...s,
        messages: mergeMessages(s.messages, older),
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
  }, [validId, limit])

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isLoadingOlder: state.isLoadingOlder,
    hasMore: state.hasMore,
    nextCursor: state.nextCursor,
    error: state.error,
    loadOlder,
    ...optimistic,
  }
}

export type ChannelMessagesStore = ReturnType<typeof useChannelMessages>
