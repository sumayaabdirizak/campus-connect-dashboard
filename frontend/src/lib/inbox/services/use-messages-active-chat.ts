'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { parseInboxHref } from '@/lib/inbox/services/parse-inbox-href'
import { isLegacyNumericDiscussionId } from '@/lib/inbox/services/is-legacy-numeric-discussion-id'
import {
  messagesChannelHref,
  messagesClubHref,
  messagesDiscoverHref,
  messagesDmHref,
  messagesServerHref,
} from '@/lib/inbox/services/messages-href'
import {
  clubPathForServerId,
  clubPathFromInbox,
  slugFromClubHref,
} from '@/lib/inbox/services/club-inbox-path'
import { useSyncMessagesActiveFromUrl } from '@/lib/inbox/services/use-sync-messages-active-from-url'
import type { ActiveChat } from '@/lib/inbox/services/messages-active-chat-types'
import { useServers } from '@/lib/discussions/queries'
import { useJoinedClubsList } from '@/components/clubs/club-detail/use-joined-clubs-list'
import type { InboxRow } from '../types'
import { isClubInboxRow, isServerInboxRow } from '@/components/inbox/inbox-helpers'
import { scheduleRouterReplace } from '@/lib/safe-router-navigation'

export type { ActiveChat } from '@/lib/inbox/services/messages-active-chat-types'

export function useMessagesActiveChat() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: serversData } = useServers()
  const rawClubs = useJoinedClubsList() || []
  const clubs = useMemo(
    () => rawClubs.map((c: any) => ({ ...c, serverId: c.serverId != null ? String(c.serverId) : null })),
    [rawClubs]
  )
  const [active, setActive] = useState<ActiveChat | null>(null)

  const replaceRoute = useCallback(
    (href: string) => scheduleRouterReplace(router, href),
    [router]
  )

  const closeChat = useCallback(() => {
    setActive(null)
    replaceRoute('/dashboard/messages')
  }, [replaceRoute])

  const openDiscover = useCallback(() => {
    const href = messagesDiscoverHref()
    setActive({ kind: 'discover', href })
    replaceRoute(href)
  }, [replaceRoute])

  const openClub = useCallback(
    (slug: string) => {
      const href = messagesClubHref(slug)
      setActive({ kind: 'club', slug, href })
      replaceRoute(href)
    },
    [replaceRoute]
  )

  const openChannel = useCallback(
    (channelId: string, serverId?: string | null) => {
      if (
        isLegacyNumericDiscussionId(channelId) ||
        isLegacyNumericDiscussionId(serverId)
      ) {
        replaceRoute('/dashboard/messages')
        return
      }
      const clubPath = clubPathForServerId(serverId, clubs)
      const slug = clubPath ? slugFromClubHref(clubPath) : null
      if (slug) {
        openClub(slug)
        return
      }
      const href = messagesChannelHref(channelId, serverId)
      setActive({ kind: 'channel', id: channelId, href })
      replaceRoute(href)
    },
    [replaceRoute, clubs, openClub]
  )

  const openHref = useCallback(
    (href: string, row?: InboxRow) => {
      if (row && isClubInboxRow(row)) {
        const clubPath = clubPathFromInbox(row, clubs)
        const slug = clubPath ? slugFromClubHref(clubPath) : null
        if (slug) {
          openClub(slug)
          return
        }
      }

      if (row && isServerInboxRow(row.type) && row.channelId) {
        openChannel(row.channelId, row.serverId ?? null)
        return
      }

      const parsed = parseInboxHref(href)
      if (parsed.kind === 'external') {
        router.push(parsed.href)
        return
      }
      if (parsed.kind === 'group') {
        const clubPath = clubPathForServerId(parsed.serverId, clubs)
        const slug = clubPath ? slugFromClubHref(clubPath) : null
        if (slug) {
          openClub(slug)
          return
        }
        const server = serversData?.results?.find((s) => s.id === parsed.serverId)
        if (server?.defaultChannelId) {
          openChannel(server.defaultChannelId, server.id)
          return
        }
        replaceRoute(messagesServerHref(parsed.serverId))
        return
      }
      if (parsed.kind === 'dm') {
        setActive({
          kind: 'dm',
          id: parsed.groupDmId,
          href: parsed.href,
        })
        replaceRoute(messagesDmHref(parsed.groupDmId))
        return
      }
      openChannel(parsed.channelId, parsed.serverId)
    },
    [router, replaceRoute, serversData?.results, openChannel, clubs, openClub]
  )

  useSyncMessagesActiveFromUrl({
    searchParams,
    clubs,
    servers: serversData?.results,
    setActive,
    openChannel,
    replace: replaceRoute,
    blockDiscover: false,
  })

  return { active, openHref, openDiscover, closeChat }
}
