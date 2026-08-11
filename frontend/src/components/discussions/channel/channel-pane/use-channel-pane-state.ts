'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMarkNotificationsRead } from '@/lib/discussions/queries/queries'
import { setQueryParam } from './query-param'

export function useChannelPaneNavigation(groupId: string | null | undefined) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const highlightParam = searchParams?.get('highlight')
  const incomingHighlightId = highlightParam || null

  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (incomingHighlightId == null) {
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
  const lastMarkedGroupRef = useRef<string | null>(null)
  useEffect(() => {
    if (groupId == null) return
    if (lastMarkedGroupRef.current === groupId) return
    lastMarkedGroupRef.current = groupId
    markRead.mutate({ groupId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const openThread = useCallback(
    (messageId: string) => {
      setDetailsOpen(false)
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

  const jumpToMessage = useCallback((messageId: string): void => {
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
  return searchParams?.get('thread') || null
}
