'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import { SCROLL_BOTTOM_THRESHOLD, type ListItem } from './message-list-helpers'

export function useMessageListScroll({
  channelId,
  scrollRef,
  items,
  virtualizer,
  highlightMessageId,
  hasMore,
  isLoadingOlder,
  loadOlder,
}: {
  channelId: string
  scrollRef: RefObject<HTMLDivElement | null>
  items: ListItem[]
  virtualizer: Virtualizer<HTMLDivElement, Element>
  highlightMessageId?: string | null
  hasMore: boolean
  isLoadingOlder: boolean
  loadOlder: () => Promise<void>
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const wasAtBottomRef = useRef(true)
  const initialScrollDoneRef = useRef(false)
  const lastBottomItemKeyRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    if (initialScrollDoneRef.current) return
    if (items.length === 0) return
    virtualizer.scrollToIndex(items.length - 1, { align: 'end' })
    initialScrollDoneRef.current = true
  }, [items.length, virtualizer])

  useEffect(() => {
    initialScrollDoneRef.current = false
    wasAtBottomRef.current = true
  }, [channelId])

  useLayoutEffect(() => {
    if (!initialScrollDoneRef.current) return
    if (items.length === 0) return
    const newestKey = items[items.length - 1].key
    if (newestKey === lastBottomItemKeyRef.current) return
    lastBottomItemKeyRef.current = newestKey
    if (wasAtBottomRef.current) {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' })
    }
  }, [items, virtualizer])

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
    if (highlightMessageId == null) return
    const idx = items.findIndex(
      (it) => it.kind === 'message' && it.message.id === highlightMessageId
    )
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center' })
  }, [highlightMessageId, items, virtualizer])

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
      { root, rootMargin: '240px 0px 0px 0px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingOlder, loadOlder])

  return {
    sentinelRef,
    initialScrollDoneRef,
  }
}
