'use client'

import { useMemo } from 'react'
import {
  useAnnouncements,
  useAnnouncementUnreadCount,
} from '@/features/announcements/api/queries'
import { IntegratedAnnouncementView } from '@/features/announcements/components/integrated-announcement-view'
import type { Announcement } from '@/features/announcements/api/types'

export function CommAnnouncementsPane() {
  const { data, isLoading } = useAnnouncements()
  const { data: unreadMeta } = useAnnouncementUnreadCount()

  const announcements: Announcement[] = useMemo(() => {
    const raw = data as { items?: Announcement[]; results?: Announcement[] } | Announcement[] | undefined
    if (Array.isArray(raw)) return raw
    if (raw?.items) return raw.items
    if (raw?.results) return raw.results
    return []
  }, [data])

  const unreadIds = useMemo(() => {
    const ids = new Set<number>()
    const list = (unreadMeta as { unreadIds?: number[] } | undefined)?.unreadIds
    if (Array.isArray(list)) {
      for (const id of list) ids.add(Number(id))
    }
    return ids
  }, [unreadMeta])

  return (
    <IntegratedAnnouncementView
      announcements={announcements}
      isLoading={isLoading}
      unreadIds={unreadIds}
    />
  )
}
