'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { parseInboxHref } from '@/lib/inbox/services/parse-inbox-href'
import {
  messagesChannelHref,
  messagesClubHref,
  messagesDiscoverHref,
  messagesDmHref,
  messagesOfficeDeskHref,
  messagesOfficeThreadHref,
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
import {
  isClubInboxRow,
  isOfficeMessagesOnlyRole,
  isServerInboxRow,
} from '@/components/inbox/inbox-helpers'
import { useAuthStore } from '@/lib/auth-store'

export type { ActiveChat } from '@/lib/inbox/services/messages-active-chat-types'

export function useMessagesActiveChat() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = useAuthStore((s) => s.user?.role)
  const officeOnly = isOfficeMessagesOnlyRole(role)
  const { data: serversData } = useServers()
  const rawClubs = useJoinedClubsList() || []
  // Clubs' `serverId` FK isn't migrated to UUID yet â€” stringify defensively so
  // this compiles against the now-string DiscussionGroup id; club/channel
  // association lookups degrade gracefully (no match) until clubs catches up.
  const clubs = useMemo(
    () => rawClubs.map((c: any) => ({ ...c, serverId: c.serverId != null ? String(c.serverId) : null })),
    [rawClubs]
  )
  const [active, setActive] = useState<ActiveChat | null>(null)

  const closeChat = useCallback(() => {
    setActive(null)
    router.replace('/dashboard/messages')
  }, [router])

  const openDiscover = useCallback(() => {
    if (officeOnly) return
    const href = messagesDiscoverHref()
    setActive({ kind: 'discover', href })
    router.replace(href)
  }, [router, officeOnly])

  const openClub = useCallback(
    (slug: string) => {
      if (officeOnly) return
      const href = messagesClubHref(slug)
      setActive({ kind: 'club', slug, href })
      router.replace(href)
    },
    [router, officeOnly]
  )

  const openOffice = useCallback(
    (threadId: number) => {
      const href = messagesOfficeThreadHref(threadId)
      setActive({ kind: 'office', id: threadId, href })
      router.replace(href)
    },
    [router]
  )

  const openOfficeDesk = useCallback(
    (slug: string) => {
      const href = messagesOfficeDeskHref(slug)
      setActive({ kind: 'office-desk', slug, href })
      router.replace(href)
    },
    [router]
  )

  const openChannel = useCallback(
    (channelId: string, serverId?: string | null) => {
      const clubPath = clubPathForServerId(serverId, clubs)
      const slug = clubPath ? slugFromClubHref(clubPath) : null
      if (slug) {
        openClub(slug)
        return
      }
      const href = messagesChannelHref(channelId, serverId)
      setActive({ kind: 'channel', id: channelId, href })
      router.replace(href)
    },
    [router, clubs, openClub]
  )

  const openHref = useCallback(
    (href: string, row?: InboxRow) => {
      if (row?.type === 'office' && row.officeKind === 'desk' && row.officeSlug) {
        openOfficeDesk(row.officeSlug)
        return
      }
      if (row?.type === 'office' && Number(row.id) > 0) {
        openOffice(Number(row.id))
        return
      }

      if (officeOnly && row && (isClubInboxRow(row) || isServerInboxRow(row.type))) {
        return
      }

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
      if (parsed.kind === 'office-desk') {
        openOfficeDesk(parsed.slug)
        return
      }
      if (parsed.kind === 'office') {
        openOffice(parsed.threadId)
        return
      }
      if (parsed.kind === 'external') {
        if (officeOnly) return
        router.push(parsed.href)
        return
      }
      if (parsed.kind === 'group') {
        if (officeOnly) return
        const clubPath = clubPathForServerId(parsed.serverId, clubs)
        const slug = clubPath ? slugFromClubHref(clubPath) : null
        if (slug) {
          openClub(slug)
          return
        }
        const server = serversData?.results?.find(
          (s) => s.id === parsed.serverId
        )
        if (server?.defaultChannelId) {
          openChannel(server.defaultChannelId, server.id)
          return
        }
        router.replace(messagesServerHref(parsed.serverId))
        return
      }
      if (parsed.kind === 'dm') {
        setActive({
          kind: 'dm',
          id: parsed.groupDmId,
          href: parsed.href,
        })
        router.replace(messagesDmHref(parsed.groupDmId))
        return
      }
      if (officeOnly) return
      openChannel(parsed.channelId, parsed.serverId)
    },
    [
      router,
      serversData?.results,
      openChannel,
      clubs,
      openClub,
      openOffice,
      openOfficeDesk,
      officeOnly,
    ]
  )

  useSyncMessagesActiveFromUrl({
    searchParams,
    clubs,
    servers: serversData?.results,
    setActive,
    openChannel,
    replace: router.replace,
    blockDiscover: officeOnly,
  })

  return { active, openHref, openDiscover, closeChat }
}

