import type { DiscussionMessage } from '@/lib/discussions/queries/types'

export const DEFAULT_LIMIT = 50

export type ChannelMessagesState = {
  messages: DiscussionMessage[]
  nextCursor: string | null
  hasMore: boolean
  isLoading: boolean
  isLoadingOlder: boolean
  error: Error | null
}

export const INITIAL_STATE: ChannelMessagesState = {
  messages: [],
  nextCursor: null,
  hasMore: false,
  isLoading: false,
  isLoadingOlder: false,
  error: null,
}

export function compareByCreatedAt(a: DiscussionMessage, b: DiscussionMessage): number {
  const at = new Date(a.createdAt).getTime()
  const bt = new Date(b.createdAt).getTime()
  if (at !== bt) return at - bt
  return a.id.localeCompare(b.id)
}

export function isMainThreadMessage(m: DiscussionMessage): boolean {
  return m.parentMessageId == null
}

export function mergeMessages(
  existing: DiscussionMessage[],
  incoming: DiscussionMessage[]
): DiscussionMessage[] {
  if (incoming.length === 0) return existing
  const byId = new Map<string, DiscussionMessage>()
  for (const m of existing) byId.set(m.id, m)
  for (const m of incoming) {
    const prev = byId.get(m.id)
    byId.set(m.id, prev ? { ...prev, ...m } : m)
  }
  return Array.from(byId.values()).toSorted(compareByCreatedAt)
}

export function unwrap(raw: unknown): DiscussionMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as { message?: DiscussionMessage; id?: string | number }
  if (obj.message && typeof obj.message === 'object') return obj.message
  // publicId-era payloads use string ids; legacy numeric ids still accepted.
  if (typeof obj.id === 'string' || typeof obj.id === 'number') {
    return raw as DiscussionMessage
  }
  return null
}

/** Normalize channel / group-DM / message ids (int or publicId UUID). */
export function asDiscussionId(
  id: string | number | null | undefined
): string | null {
  if (id == null) return null
  const s = String(id).trim()
  if (!s || s === 'NaN' || s === 'undefined' || s === 'null') return null
  return s
}

export function discussionIdsEqual(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): boolean {
  const left = asDiscussionId(a)
  const right = asDiscussionId(b)
  return left != null && right != null && left === right
}
