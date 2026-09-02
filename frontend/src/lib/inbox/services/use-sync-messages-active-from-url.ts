'use client'

import { useEffect } from 'react'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import {
  messagesChannelHref,
  messagesClubHref,
  messagesClubManageHref,
  messagesDiscoverHref,
  messagesDmHref,
} from '@/lib/inbox/services/messages-href'
import {
  clubPathForServerId,
  slugFromClubHref,
} from '@/lib/inbox/services/club-inbox-path'
import type { ActiveChat } from './messages-active-chat-types'

type ClubRef = { slug: string; serverId?: string | null }
type ServerRow = { id: string; defaultChannelId?: string | null }

/** Sync Messages URL search params → active chat state. */
export function useSyncMessagesActiveFromUrl({
  searchParams,
  clubs,
  servers,
  setActive,
  openChannel,
  replace,
  blockDiscover = false,
}: {
  searchParams: ReadonlyURLSearchParams | null
  clubs: ClubRef[]
  servers: ServerRow[] | undefined
  setActive: (next: ActiveChat | null) => void
  openChannel: (channelId: string, serverId?: string | null) => void
  replace: (href: string) => void
  blockDiscover?: boolean
}) {
  useEffect(() => {
    const discover = searchParams?.get('discover')
    const clubSlug = searchParams?.get('club')?.trim()
    const dm = searchParams?.get('dm')?.trim() || null
    const channel = searchParams?.get('channel')?.trim() || null
    const server = searchParams?.get('server')?.trim() || null

    if (discover === '1' || discover === 'true') {
      if (blockDiscover) {
        replace('/dashboard/messages')
        setActive(null)
        return
      }
      setActive({ kind: 'discover', href: messagesDiscoverHref() })
      return
    }
    if (clubSlug) {
      const manage =
        searchParams?.get('manage') === '1' ||
        searchParams?.get('manage') === 'true'
      setActive(
        manage
          ? {
              kind: 'club-manage',
              slug: clubSlug,
              href: messagesClubManageHref(clubSlug),
            }
          : {
              kind: 'club',
              slug: clubSlug,
              href: messagesClubHref(clubSlug),
            }
      )
      return
    }
    if (dm) {
      setActive({ kind: 'dm', id: dm, href: messagesDmHref(dm) })
      return
    }
    if (server) {
      const clubPath = clubPathForServerId(server, clubs)
      const slug = clubPath ? slugFromClubHref(clubPath) : null
      if (slug) {
        replace(messagesClubHref(slug))
        return
      }
    }
    if (channel) {
      setActive({
        kind: 'channel',
        id: channel,
        href: messagesChannelHref(channel, server),
      })
      return
    }
    if (server) {
      const row = servers?.find((s) => s.id === server)
      if (row?.defaultChannelId) {
        openChannel(row.defaultChannelId, row.id)
      }
      return
    }
    setActive(null)
  }, [searchParams, servers, openChannel, clubs, replace, setActive, blockDiscover])
}
