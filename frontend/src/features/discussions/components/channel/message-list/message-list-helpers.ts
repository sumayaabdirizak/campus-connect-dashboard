import type { DiscussionMessage } from '../../../api/types'
import { isSameLocalDay } from '../day-separator'

export const SCROLL_BOTTOM_THRESHOLD = 120
export const ESTIMATED_ROW_HEIGHT = 64
export const GROUP_WINDOW_MS = 5 * 60 * 1000

export type ListItem =
  | { kind: 'day'; key: string; iso: string }
  | {
      kind: 'message'
      key: string
      message: DiscussionMessage
      showHeader: boolean
    }

export function startsNewGroup(prev: DiscussionMessage | null, m: DiscussionMessage): boolean {
  if (!prev) return true
  if (!isSameLocalDay(prev.createdAt, m.createdAt)) return true
  if (prev.senderId !== m.senderId) return true
  if (prev.isAnonymous !== m.isAnonymous) return true
  if (prev.deletedAt || m.deletedAt) return true
  const gap = new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return gap > GROUP_WINDOW_MS
}

export function buildItems(messages: DiscussionMessage[]): ListItem[] {
  const items: ListItem[] = []
  let prev: DiscussionMessage | null = null
  for (const m of messages) {
    const showDay = !prev || !isSameLocalDay(prev.createdAt, m.createdAt)
    if (showDay) {
      items.push({ kind: 'day', key: `day-${m.id}`, iso: m.createdAt })
    }
    items.push({
      kind: 'message',
      key: `msg-${m.id}`,
      message: m,
      showHeader: showDay || startsNewGroup(prev, m),
    })
    prev = m
  }
  return items
}
