import type { InboxRow } from '../types'
import { isClubInboxRow } from '@/components/inbox/inbox-helpers'
import { messagesClubHref } from '@/lib/inbox/services/messages-href'

type ClubRef = { slug: string; serverId?: string | null }

export function slugFromClubHref(href: string): string | null {
  const q = href.match(/[?&]club=([^&]+)/)?.[1]
  if (q) return decodeURIComponent(q)
  const path = href.match(/\/dashboard\/clubs\/([^/?#]+)/)?.[1]
  return path ? decodeURIComponent(path) : null
}

function resolveSlug(
  row: Pick<InboxRow, 'clubSlug' | 'href' | 'serverId' | 'id'> | null | undefined,
  clubs: ClubRef[]
): string | null {
  if (!row) return null
  if (row.clubSlug) return row.clubSlug
  if (row.href) {
    const fromHref = slugFromClubHref(row.href)
    if (fromHref) return fromHref
  }
  const sid = row.serverId ?? String(row.id)
  if (!sid) return null
  return clubs.find((c) => c.serverId === sid)?.slug ?? null
}

/** Resolve Messages club href for an inbox row. */
export function clubPathFromInbox(
  row: Pick<InboxRow, 'type' | 'subtitle' | 'serverId' | 'id' | 'clubSlug' | 'href'> | null | undefined,
  clubs: ClubRef[]
): string | null {
  if (!row || !isClubInboxRow(row)) return null
  const slug = resolveSlug(row, clubs)
  return slug ? messagesClubHref(slug) : null
}

export function clubPathForServerId(
  serverId: string | null | undefined,
  clubs: ClubRef[]
): string | null {
  if (!serverId) return null
  const club = clubs.find((c) => c.serverId === serverId)
  return club ? messagesClubHref(club.slug) : null
}
