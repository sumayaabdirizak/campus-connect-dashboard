'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import {
  useChannel,
  useChannelMembers,
  useChannelPins,
  useServer,
} from '../../../api/queries'
import { useDiscussionPermissions } from '../../../hooks/use-discussion-permissions'
import { useDiscussionServerRoom } from '../../../hooks/use-discussion-room'
import { useChannelMessages } from '../../../hooks/use-channel-messages'
import { useChannelTyping } from '../../../hooks/use-channel-typing'
import { MessageList } from '../message-list'
import { MessageComposer } from '../../composer/message-composer'
import { PinnedStrip } from '../pinned-strip'
import { TypingIndicator } from '../typing-indicator'
import { ChannelSettingsDialog } from '../channel-settings-dialog'
import { ThreadPanel } from '../../threads/thread-panel'
import { DetailsPanel } from '../../details/details-panel'
import { ChannelPaneEmpty } from './channel-pane-empty'
import { ChannelPaneHeader } from './channel-pane-header'
import { useChannelPaneNavigation, useThreadRootId } from './use-channel-pane-state'

export function ChannelPane({ channelId }: { channelId: number | null }) {
  const router = useRouter()
  const validThreadId = useThreadRootId()

  const myUser = useAuthStore((s) => s.user)
  const myUserId = myUser?.id != null ? Number(myUser.id) : null
  const myDisplayName = myUser?.full_name ?? myUser?.name ?? myUser?.email ?? null

  const { data: channelData, isLoading } = useChannel(channelId)
  const channel = channelData?.channel ?? null
  const { data: serverData } = useServer(channel?.serverId ?? null)
  useDiscussionServerRoom(channel?.serverId ?? null)
  const { data: memberData } = useChannelMembers(channelId)
  const { data: pinsData } = useChannelPins(channelId)
  const perms = useDiscussionPermissions(channelData?.myPermissions)

  const pinnedSet = useMemo(
    () => new Set((pinsData?.results ?? []).map((p) => p.messageId)),
    [pinsData]
  )

  const messagesStore = useChannelMessages(channelId)
  const typers = useChannelTyping(channelId, myUserId)

  const {
    highlightedId,
    detailsOpen,
    setDetailsOpen,
    settingsOpen,
    setSettingsOpen,
    openThread,
    closeThread,
    jumpToMessage,
  } = useChannelPaneNavigation(channel?.serverId ?? null)

  if (channelId == null) return <ChannelPaneEmpty />

  const memberCount = memberData?.results?.length ?? 0
  const e2eeEnabled = serverData?.server?.e2eeEnabled
  const e2eeKeyVersion = serverData?.server?.e2eeCurrentKeyVersion

  return (
    <div className='flex h-full flex-1'>
      <div className='comm-chat-canvas flex min-w-0 flex-1 flex-col'>
        <ChannelPaneHeader
          channelId={channelId}
          channelName={channel?.name}
          channelTopic={channel?.topic}
          serverId={channel?.serverId ?? null}
          memberCount={memberCount}
          e2eeEnabled={e2eeEnabled}
          perms={perms}
          isLoading={isLoading}
          detailsOpen={detailsOpen}
          onToggleDetails={() => setDetailsOpen((v) => !v)}
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
          onOptimisticInsert={messagesStore.addOptimisticMessage}
          onOptimisticReplace={messagesStore.replaceOptimisticMessage}
          onOptimisticRemove={messagesStore.removeOptimisticMessage}
        />
      </div>

      {validThreadId != null && (
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
      )}

      {detailsOpen && (
        <DetailsPanel channelId={channelId} onClose={() => setDetailsOpen(false)} />
      )}

      <ChannelSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        channel={channel}
        myPermissions={channelData?.myPermissions ?? null}
        myServerPermissions={serverData?.myServerPermissions ?? null}
        onChannelHardDeleted={() => {
          setSettingsOpen(false)
          if (channel?.serverId != null) {
            router.push(`/dashboard/chat/${channel.serverId}`)
          }
        }}
        onJumpToPinnedMessage={jumpToMessage}
      />
    </div>
  )
}
