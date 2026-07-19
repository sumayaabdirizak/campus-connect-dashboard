'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useGroupDm } from '../../../api/queries'
import { useGroupDmMessages } from '../../../hooks/use-group-dm-messages'
import { useGroupDmTyping } from '../../../hooks/use-channel-typing'
import { useDmReadReceipts } from '../../../hooks/use-dm-read-receipts'
import { DmMessageList } from '../dm-message-list'
import { DmComposer } from '../dm-composer'
import { TypingIndicator } from '../../channel/typing-indicator'
import { dmDisplayName } from './dm-pane-helpers'
import { useDmPaneEffects } from './use-dm-pane-effects'
import { DmPaneEmpty, DmPaneError, DmPaneHeader } from './dm-pane-states'

export function DmPane({ groupDmId }: { groupDmId: number | null }) {
  const myUser = useAuthStore((s) => s.user)
  const myUserId = myUser?.id != null ? Number(myUser.id) : null
  const myDisplayName = myUser?.full_name ?? myUser?.name ?? myUser?.email ?? null

  const { data, isLoading, error } = useGroupDm(groupDmId)
  const detail = data?.groupDm ?? null
  const myRole = data?.myRole
  const isOwner = myRole === 'OWNER'
  const myMember = detail?.members?.find((m) => Number(m.userId) === myUserId) ?? null
  const canPost = !!myMember?.canPost

  const messagesStore = useGroupDmMessages(groupDmId)
  const typers = useGroupDmTyping(groupDmId, myUserId)
  const { latestReadByOthers } = useDmReadReceipts(groupDmId, myUserId)

  const memberCount = detail?.members?.length ?? 0
  const { handleLeave, leaveMut } = useDmPaneEffects({
    groupDmId,
    messagesStore,
    isOwner,
    memberCount,
  })

  if (groupDmId == null) return <DmPaneEmpty />
  if (error) return <DmPaneError message={error.message} />

  const previewMembers = detail?.members?.slice(0, 4) ?? []
  const displayName = dmDisplayName(detail, myUserId)

  return (
    <div className='comm-chat-canvas flex h-full flex-1 flex-col'>
      <DmPaneHeader
        displayName={displayName}
        isLoading={isLoading}
        previewMembers={previewMembers}
        memberCount={memberCount}
        leavePending={leaveMut.isPending}
        onLeave={handleLeave}
      />

      <DmMessageList
        groupDmId={groupDmId}
        myUserId={myUserId}
        myDisplayName={myDisplayName}
        isOwner={isOwner}
        store={messagesStore}
        latestReadByOthers={latestReadByOthers}
      />

      <TypingIndicator typers={typers} />

      <DmComposer
        groupDmId={groupDmId}
        canPost={canPost}
        placeholder={`Message ${displayName}`}
        myUserId={myUserId}
        myDisplayName={myDisplayName}
        onOptimisticInsert={messagesStore.addOptimisticMessage}
        onOptimisticReplace={messagesStore.replaceOptimisticMessage}
        onOptimisticRemove={messagesStore.removeOptimisticMessage}
      />
    </div>
  )
}
