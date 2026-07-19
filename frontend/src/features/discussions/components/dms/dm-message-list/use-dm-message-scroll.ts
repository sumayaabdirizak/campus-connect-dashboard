'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import type { DiscussionMessage } from '../../../api/types'
import { SCROLL_BOTTOM_THRESHOLD } from './constants'

export function useDmMessageScroll({
  groupDmId,
  messages,
  hasMore,
  isLoadingOlder,
  loadOlder,
}: {
  groupDmId: number
  messages: DiscussionMessage[]
  hasMore: boolean
  isLoadingOlder: boolean
  loadOlder: () => Promise<void>
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const wasAtBottomRef = useRef(true)
  const lastScrollHeightRef = useRef(0)
  const lastTopMessageIdRef = useRef<number | null>(null)
  const initialScrollDoneRef = useRef(false)

  useLayoutEffect(() => {
    if (initialScrollDoneRef.current) return
    if (messages.length === 0) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    initialScrollDoneRef.current = true
    lastScrollHeightRef.current = el.scrollHeight
    lastTopMessageIdRef.current = messages[0]?.id ?? null
  }, [messages])

  useEffect(() => {
    initialScrollDoneRef.current = false
    wasAtBottomRef.current = true
    lastScrollHeightRef.current = 0
    lastTopMessageIdRef.current = null
  }, [groupDmId])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !initialScrollDoneRef.current) return
    const newTopId = messages[0]?.id ?? null
    if (
      newTopId !== null &&
      lastTopMessageIdRef.current !== null &&
      newTopId !== lastTopMessageIdRef.current
    ) {
      const delta = el.scrollHeight - lastScrollHeightRef.current
      if (delta > 0) el.scrollTop = el.scrollTop + delta
    } else if (wasAtBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
    lastScrollHeightRef.current = el.scrollHeight
    lastTopMessageIdRef.current = newTopId
  }, [messages])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      wasAtBottomRef.current = distanceFromBottom < SCROLL_BOTTOM_THRESHOLD
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollRef.current
    if (!sentinel || !root) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !isLoadingOlder) {
            void loadOlder()
          }
        }
      },
      { root, rootMargin: '120px 0px 0px 0px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingOlder, loadOlder])

  return { scrollRef, sentinelRef, initialScrollDoneRef }
}
