import type { DiscussionMessage } from '@/lib/discussions/queries/types'

export const DEFAULT_LIMIT = 50

export type ThreadMessagesState = {
  root: DiscussionMessage | null
  replies: DiscussionMessage[]
  nextCursor: string | null
  hasMore: boolean
  isLoading: boolean
  isLoadingOlder: boolean
  error: Error | null
}

export const INITIAL_STATE: ThreadMessagesState = {
  root: null,
  replies: [],
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

export function mergeReplies(
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

export { unwrap } from '../use-channel-messages/message-list-helpers'
