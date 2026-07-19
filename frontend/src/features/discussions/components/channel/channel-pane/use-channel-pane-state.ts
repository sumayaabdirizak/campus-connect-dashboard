'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMarkNotificationsRead } from '../../../api/queries'
import { setQueryParam } from './query-param'

export function useChannelPaneNavigation(groupId: number | null | undefined) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const highlightParam = searchParams?.get('highlight')
  const incomingHighlightId = highlightParam ? Number(highlightParam) : null

  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (
      incomingHighlightId == null ||
      !Number.isFinite(incomingHighlightId) ||
      incomingHighlightId <= 0
    ) {
      return
    }
    setHighlightedId(incomingHighlightId)
    const t = window.setTimeout(() => setHighlightedId(null), 2000)
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    next.delete('highlight')
    const qs = next.toString()
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingHighlightId])

  const markRead = useMarkNotificationsRead()
  const lastMarkedGroupRef = useRef<number | null>(null)
  useEffect(() => {
    if (groupId == null) return
    if (lastMarkedGroupRef.current === groupId) return
    lastMarkedGroupRef.current = groupId
    markRead.mutate({ groupId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const openThread = useCallback(
    (messageId: number) => {
      router.replace(
        `${window.location.pathname}${setQueryParam(
          new URLSearchParams(searchParams?.toString() ?? ''),
          'thread',
          String(messageId)
        )}`
      )
    },
    [router, searchParams]
  )

  const closeThread = useCallback(() => {
    router.replace(
      `${window.location.pathname}${setQueryParam(
        new URLSearchParams(searchParams?.toString() ?? ''),
        'thread',
        null
      )}`
    )
  }, [router, searchParams])

  const jumpToMessage = useCallback((messageId: number) => {
    setHighlightedId(messageId)
    window.setTimeout(() => setHighlightedId(null), 2000)
  }, [])

  return {
    highlightedId,
    detailsOpen,
    setDetailsOpen,
    settingsOpen,
    setSettingsOpen,
    openThread,
    closeThread,
    jumpToMessage,
  }
}

export function useThreadRootId() {
  const searchParams = useSearchParams()
  const threadParam = searchParams?.get('thread')
  const threadRootId = threadParam ? Number(threadParam) : null
  return Number.isFinite(threadRootId) && (threadRootId ?? 0) > 0 ? threadRootId : null
}
