'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useServers } from '../../api/queries'
import { ConversationSidebar } from './conversation-sidebar'
import { UnifiedSidebar } from './unified-sidebar'
import { ChannelPane } from '../channel'
import { DmPane } from '../dms'
import { CommAnnouncementsPane } from './comm-announcements-pane'

function toFiniteId(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function ChatShellInner() {
  const params = useParams()
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const showAnnouncements = searchParams?.get('view') === 'announcements'

  const routeServerId = toFiniteId(params?.serverId)
  const channelParts = params?.channelParts
  const routeChannelId = toFiniteId(
    Array.isArray(channelParts) ? channelParts[0] : undefined
  )
  const routeGroupDmId = toFiniteId(params?.groupDmId)
  const isDmRoute = pathname.startsWith('/dashboard/chat/dm')

  const { data: serversData, isLoading: serversLoading } = useServers()
  const firstServer = serversData?.results?.[0] ?? null
  const firstServerId = firstServer?.id ?? null
  const firstDefaultChannelId = firstServer?.defaultChannelId ?? null

  const inConversation =
    !showAnnouncements && (routeChannelId != null || routeGroupDmId != null)

  useEffect(() => {
    if (showAnnouncements) return
    if (isDmRoute || routeGroupDmId != null) return
    if (routeServerId != null) return
    if (serversLoading) return
    if (firstServerId == null) return
    if (
      typeof window !== 'undefined' &&
      !window.matchMedia('(min-width: 768px)').matches
    ) {
      return
    }
    const target = firstDefaultChannelId
      ? `/dashboard/chat/${firstServerId}/${firstDefaultChannelId}`
      : `/dashboard/chat/${firstServerId}`
    router.replace(target)
  }, [
    showAnnouncements,
    routeServerId,
    routeGroupDmId,
    isDmRoute,
    firstServerId,
    firstDefaultChannelId,
    serversLoading,
    router,
  ])

  return (
    <div
      data-comm
      data-theme='campus-connect'
      className='flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background'
    >
      <div className='hidden md:flex'>
        <UnifiedSidebar />
      </div>

      {!showAnnouncements ? (
        <ConversationSidebar
          activeServerId={routeServerId}
          activeChannelId={routeChannelId}
          className={inConversation ? 'hidden md:flex' : 'flex'}
        />
      ) : (
        <ConversationSidebar
          activeServerId={null}
          activeChannelId={null}
          announcementsMode
          className='hidden md:flex'
        />
      )}

      <main
        className={cn(
          'comm-chat-canvas min-w-0 flex-1 flex-col',
          showAnnouncements || inConversation ? 'flex' : 'hidden md:flex'
        )}
      >
        {(inConversation || showAnnouncements) && (
          <button
            type='button'
            onClick={() =>
              router.push(showAnnouncements ? '/dashboard/chat' : '/dashboard/messages')
            }
            className='flex h-11 shrink-0 items-center gap-2 border-b border-border/70 bg-card/80 px-3 text-sm font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:hidden'
          >
            <ArrowLeft className='h-4 w-4' />
            {showAnnouncements ? 'Communication' : 'Messages'}
          </button>
        )}

        {showAnnouncements ? (
          <CommAnnouncementsPane />
        ) : routeGroupDmId != null ? (
          <DmPane groupDmId={routeGroupDmId} />
        ) : (
          <ChannelPane channelId={routeChannelId} />
        )}
      </main>
    </div>
  )
}

/**
 * Top-level discussion shell — 3-column layout:
 *   1. UnifiedSidebar (icon strip)
 *   2. ConversationSidebar (servers / channels)
 *   3. Channel / DM / Announcements pane
 */
export function ChatShellV2() {
  return (
    <TooltipProvider delayDuration={150}>
      <Suspense
        fallback={
          <div
            data-comm
            className='flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-background text-sm text-muted-foreground'
          >
            Loading communication…
          </div>
        }
      >
        <ChatShellInner />
      </Suspense>
    </TooltipProvider>
  )
}
