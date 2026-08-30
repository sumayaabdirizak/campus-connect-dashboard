'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import {
  useChannel,
  useChannelMembers,
  useChannelPins,
  useServer,
} from '@/lib/discussions/queries/queries'
import { useDiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions'
import { useDiscussionServerRoom } from '@/lib/discussions/services/use-discussion-room'
import { useChannelMessages } from '@/lib/discussions/services/use-channel-messages'
import { useChannelTyping } from '@/lib/discussions/services/use-channel-typing'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'
import { MessageList } from '@/components/discussions/channel/message-list'
import { MessageComposer } from '@/components/discussions/composer/message-composer'
import { PinnedStrip } from '@/components/discussions/channel/pinned-strip'
import { TypingIndicator } from '@/components/discussions/channel/typing-indicator'
import { ChannelSettingsDialog } from '@/components/discussions/channel/channel-settings-dialog'
import { ThreadPanel } from '@/components/discussions/threads/thread-panel'
import { DetailsPanel } from '@/components/discussions/details/details-panel'
import { ChannelPaneEmpty } from './channel-pane-empty'
import { ChannelPaneHeader } from './channel-pane-header'
import { useChannelPaneNavigation, useThreadRootId } from './use-channel-pane-state'

export function ChannelPane({ channelId }: { channelId: string | null }) {
  const router = useRouter()
  const validThreadId = useThreadRootId()
  const [replyTo, setReplyTo] = useState<DiscussionMessage | null>(null)

  useEffect(() => {
    setReplyTo(null)
  }, [channelId])

  const myUser = useAuthStore((s) => s.user)
  const myUserId = myUser?.id != null ? Number(myUser.id) : null
  const myDisplayName = myUser?.full_name ?? myUser?.name ?? myUser?.email ?? null

  const { data: channelData, isLoading } = useChannel(channelId)
  const channel = channelData?.channel ?? null
  const serverId = channel?.serverId ?? null
  const { data: serverData } = useServer(serverId)
  useDiscussionServerRoom(serverId)
  const { data: memberData } = useChannelMembers(channelId)
  const { data: pinsData } = useChannelPins(channelId)
  const perms = useDiscussionPermissions(channelData?.myPermissions)

  const pinnedSet = useMemo(
    () => new Set((pinsData?.results ?? []).map((p) => p.messageId)),
    [pinsData]
  )

  const messagesStore = useChannelMessages(channelId)
  const typers = useChannelTyping(channelId, myUserId ?? null)

  const {
    highlightedId,
    detailsOpen,
    setDetailsOpen,
    settingsOpen,
    setSettingsOpen,
    openThread,
    closeThread,
    jumpToMessage,
  } = useChannelPaneNavigation(serverId)

  if (channelId == null) return <ChannelPaneEmpty />

  const memberCount = memberData?.results?.length ?? 0
  const e2eeEnabled = serverData?.server?.e2eeEnabled
  const e2eeKeyVersion = serverData?.server?.e2eeCurrentKeyVersion

  return (
    <div className='relative flex h-full min-h-0 min-w-0 flex-1 overflow-x-clip'>
      <div className='comm-chat-canvas flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip'>
        <ChannelPaneHeader
          channelId={channelId}
          channelName={channel?.name}
          channelTopic={channel?.topic}
          conversationTitle={channel?.conversationTitle}
          serverId={channel?.serverId ?? null}
          serverName={serverData?.server?.name}
          serverIconUrl={serverData?.server?.iconUrl}
          memberCount={memberCount}
          e2eeEnabled={e2eeEnabled}
          perms={perms}
          isLoading={isLoading}
          detailsOpen={detailsOpen}
          onToggleDetails={() => {
            if (!detailsOpen) closeThread()
            setDetailsOpen((v) => !v)
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onJumpToMessage={jumpToMessage}
        />

        <PinnedStrip
          channelId={channelId}
          canManagePins={perms.canPin}
          onJump={jumpToMessage}
        />

        <MessageList
          channelId={channelId}
          myUserId={myUserId}
          myDisplayName={myDisplayName}
          perms={perms}
          channelName={channel?.name}
          pinnedSet={pinnedSet}
          onReplyInThread={openThread}
          onQuoteReply={setReplyTo}
          onJumpToReply={jumpToMessage}
          highlightMessageId={highlightedId}
          store={messagesStore}
        />

        <TypingIndicator typers={typers} />

        <MessageComposer
          channelId={channelId}
          channelName={channel?.name}
          channelSlug={channel?.slug}
          serverName={serverData?.server?.name}
          perms={perms}
          e2eeEnabled={e2eeEnabled}
          e2eeKeyVersion={e2eeKeyVersion}
          myUserId={myUserId}
          myDisplayName={myDisplayName}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onOptimisticInsert={messagesStore.addOptimisticMessage}
          onOptimisticReplace={messagesStore.replaceOptimisticMessage}
          onOptimisticRemove={messagesStore.removeOptimisticMessage}
        />
      </div>

      {validThreadId != null ? (
        <div
          className={
            // Mobile: full-screen over chat. md+: dock beside channel so both stay visible.
            'flex min-h-0 min-w-0 flex-col overflow-hidden border-l bg-background ' +
            'absolute inset-0 z-30 md:static md:z-auto md:w-[min(42%,22rem)] md:max-w-sm md:shrink-0'
          }
        >
          <ThreadPanel
            channelId={channelId}
            threadRootId={validThreadId}
            channelName={channel?.name}
            myUserId={myUserId}
            myDisplayName={myDisplayName}
            perms={perms}
            pinnedSet={pinnedSet}
            e2eeEnabled={e2eeEnabled}
            e2eeKeyVersion={e2eeKeyVersion}
            onClose={closeThread}
          />
        </div>
      ) : null}

      {detailsOpen ? (
        <>
          <button
            type='button'
            aria-label='Close details'
            className='absolute inset-0 z-20 bg-black/30'
            onClick={() => setDetailsOpen(false)}
          />
          <div className='absolute inset-y-0 right-0 z-30 flex w-full max-w-sm min-w-0 overflow-hidden shadow-xl sm:w-[20rem]'>
            <DetailsPanel
              channelId={channelId}
              onClose={() => setDetailsOpen(false)}
              onJumpToMessage={(messageId) => {
                setDetailsOpen(false)
                jumpToMessage(messageId)
              }}
            />
          </div>
        </>
      ) : null}

      <ChannelSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        channel={channel}
        myPermissions={channelData?.myPermissions ?? null}
        myServerPermissions={serverData?.myServerPermissions ?? null}
        onChannelHardDeleted={() => {
          setSettingsOpen(false)
          if (channel?.serverId != null) {
            router.push('/dashboard/messages')
          }
        }}
      />
    </div>
  )
}
