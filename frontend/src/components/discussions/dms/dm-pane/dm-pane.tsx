'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useGroupDm } from '@/lib/discussions/queries/queries'
import { useGroupDmMessages } from '@/lib/discussions/services/use-group-dm-messages'
import { useGroupDmTyping } from '@/lib/discussions/services/use-channel-typing'
import { useDmReadReceipts } from '@/lib/discussions/services/use-dm-read-receipts'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'
import { DmMessageList } from '@/components/discussions/dms/dm-message-list'
import { DmComposer } from '@/components/discussions/dms/dm-composer'
import { TypingIndicator } from '@/components/discussions/channel/typing-indicator'
import { dmDisplayName } from './dm-pane-helpers'
import { useDmPaneEffects } from './use-dm-pane-effects'
import { DmPaneEmpty, DmPaneError, DmPaneHeader } from './dm-pane-states'
import { AddMembersDialog } from '@/components/discussions/dms/dm-add-members/add-members-dialog'
import { RenameDmDialog } from './rename-dm-dialog'
import { ViewMembersDialog } from './view-members-dialog'

export function DmPane({ groupDmId }: { groupDmId: string | null }) {
  const myUser = useAuthStore((s) => s.user)
  const myUserId = myUser?.id != null ? Number(myUser.id) : null
  const myDisplayName = myUser?.full_name ?? myUser?.name ?? myUser?.email ?? null
  const [replyTo, setReplyTo] = useState<DiscussionMessage | null>(null)
  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [viewMembersOpen, setViewMembersOpen] = useState(false)

  useEffect(() => {
    setReplyTo(null)
  }, [groupDmId])

  const { data, isLoading, error } = useGroupDm(groupDmId)
  const detail = data?.groupDm ?? null
  const myRole = data?.myRole
  const isOwner = myRole === 'OWNER'
  const myMember = detail?.members?.find((m) => Number(m.userId) === myUserId) ?? null
  const canPost = !!myMember?.canPost

  const numericGroupDmId = groupDmId != null ? Number(groupDmId) : null
  const messagesStore = useGroupDmMessages(numericGroupDmId)
  const typers = useGroupDmTyping(numericGroupDmId, myUserId)
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

  const isOneToOne =
    memberCount === 2 && !(detail?.name && detail.name.trim().length > 0)
  const previewMembers = isOneToOne
    ? (detail?.members?.filter((m) => Number(m.userId) !== myUserId).slice(0, 1) ??
      [])
    : (detail?.members?.slice(0, 4) ?? [])
  const displayName = dmDisplayName(detail, myUserId)
  const existingMemberIds = detail?.members?.map((m) => Number(m.userId)) ?? []

  return (
    <div className='comm-chat-canvas flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <DmPaneHeader
        displayName={displayName}
        isLoading={isLoading}
        previewMembers={previewMembers}
        memberCount={memberCount}
        isOneToOne={isOneToOne}
        iconUrl={detail?.iconUrl ?? null}
        leavePending={leaveMut.isPending}
        onLeave={handleLeave}
        onAddMembers={!isOneToOne ? () => setAddMembersOpen(true) : undefined}
        onRename={isOwner && !isOneToOne ? () => setRenameOpen(true) : undefined}
        onViewMembers={!isOneToOne ? () => setViewMembersOpen(true) : undefined}
      />

      {groupDmId != null ? (
        <>
          <AddMembersDialog
            open={addMembersOpen}
            onOpenChange={setAddMembersOpen}
            groupDmId={groupDmId}
            existingMemberIds={existingMemberIds}
          />
          <RenameDmDialog
            open={renameOpen}
            onOpenChange={setRenameOpen}
            groupDmId={groupDmId}
            currentName={detail?.name ?? ''}
            iconUrl={detail?.iconUrl ?? null}
          />
          <ViewMembersDialog
            open={viewMembersOpen}
            onOpenChange={setViewMembersOpen}
            groupDmId={groupDmId}
            members={detail?.members ?? []}
            myUserId={myUserId}
            isOwner={isOwner}
          />
        </>
      ) : null}

      <DmMessageList
        groupDmId={groupDmId}
        myUserId={myUserId}
        myDisplayName={myDisplayName}
        isOwner={isOwner}
        isOneToOne={isOneToOne}
        store={messagesStore}
        latestReadByOthers={latestReadByOthers != null ? String(latestReadByOthers) : null}
        onReply={setReplyTo}
      />

      <TypingIndicator typers={typers} />

      <DmComposer
        groupDmId={groupDmId}
        canPost={canPost}
        placeholder={`Message ${displayName}`}
        myUserId={myUserId}
        myDisplayName={myDisplayName}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onOptimisticInsert={messagesStore.addOptimisticMessage}
        onOptimisticReplace={messagesStore.replaceOptimisticMessage}
        onOptimisticRemove={messagesStore.removeOptimisticMessage}
      />
    </div>
  )
}
