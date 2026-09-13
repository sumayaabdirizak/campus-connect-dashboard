'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { messagesChannelHref } from '@/lib/inbox/services/messages-href'
import { isLegacyNumericDiscussionId } from '@/lib/inbox/services/is-legacy-numeric-discussion-id'
import { scheduleRouterReplace } from '@/lib/safe-router-navigation'

/**
 * Rewrite legacy numeric `channel` / `server` query ids to publicId UUIDs.
 * Never rewrite when the URL already uses UUIDs — that caused an A↔B
 * navigation loop when channel metadata briefly mismatched the URL.
 */
export function useCanonicalizeChannelUrl(
  urlChannelId: string | null | undefined,
  channel: { id: string; serverId?: string | null } | null | undefined
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lastHrefRef = useRef<string | null>(null)

  const urlServer = searchParams?.get('server')?.trim() || null
  const thread = searchParams?.get('thread')
  const highlight = searchParams?.get('highlight')

  useEffect(() => {
    if (!urlChannelId || !channel?.id) return

    const canonicalChannel = String(channel.id)
    const canonicalServer =
      channel.serverId != null ? String(channel.serverId) : null

    const channelNeedsConvert =
      isLegacyNumericDiscussionId(urlChannelId) &&
      urlChannelId !== canonicalChannel
    const serverNeedsConvert =
      urlServer != null &&
      isLegacyNumericDiscussionId(urlServer) &&
      canonicalServer != null &&
      urlServer !== canonicalServer

    if (!channelNeedsConvert && !serverNeedsConvert) return

    const nextChannel = channelNeedsConvert ? canonicalChannel : urlChannelId
    const nextServer = serverNeedsConvert
      ? canonicalServer
      : (canonicalServer ?? urlServer)

    const href = messagesChannelHref(nextChannel, nextServer)
    const next = new URL(href, 'http://local')
    if (thread) next.searchParams.set('thread', thread)
    if (highlight) next.searchParams.set('highlight', highlight)
    const full = `${next.pathname}?${next.searchParams.toString()}`
    if (lastHrefRef.current === full) return
    lastHrefRef.current = full
    scheduleRouterReplace(router, full)
  }, [
    urlChannelId,
    urlServer,
    channel?.id,
    channel?.serverId,
    thread,
    highlight,
    router,
  ])
}
