'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { confirmAction, handleApiError, showToast } from '@/lib/notifications'
import { useLeaveGroupDm, useMarkNotificationsRead } from '../../../api/queries'
import { emitMessageRead } from '../../../api/socket'
import type { GroupDmMessagesStore } from '../../../hooks/use-group-dm-messages'

export function useDmPaneEffects({
  groupDmId,
  messagesStore,
  isOwner,
  memberCount,
}: {
  groupDmId: number | null
  messagesStore: GroupDmMessagesStore
  isOwner: boolean
  memberCount: number
}) {
  const router = useRouter()
  const leaveMut = useLeaveGroupDm(groupDmId ?? 0)
  const markRead = useMarkNotificationsRead()

  const lastEmittedReadIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (groupDmId == null) return
    const messages = messagesStore.messages
    if (messages.length === 0) return
    const latest = messages[messages.length - 1]
    if (latest.id < 0) return
    if (lastEmittedReadIdRef.current === latest.id) return
    lastEmittedReadIdRef.current = latest.id
    emitMessageRead({ groupDmId, messageId: latest.id })
  }, [groupDmId, messagesStore.messages])

  const lastMarkedRef = useRef<number | null>(null)
  useEffect(() => {
    if (groupDmId == null) return
    if (lastMarkedRef.current === groupDmId) return
    lastMarkedRef.current = groupDmId
    markRead.mutate({ groupDmId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDmId])

  const handleLeave = async () => {
    if (groupDmId == null || leaveMut.isPending) return
    const willArchive = memberCount <= 1
    const message = willArchive
      ? 'You are the last member. Leaving will archive this conversation.'
      : isOwner
        ? 'Leave this conversation? Ownership will pass to the oldest remaining member.'
        : 'Leave this conversation? You will no longer see new messages here.'
    if (
      !(await confirmAction(
        willArchive ? 'Archive conversation?' : 'Leave conversation?',
        message,
        willArchive ? 'Archive & leave' : 'Leave',
        { icon: 'warning', danger: willArchive }
      ))
    ) {
      return
    }
    leaveMut.mutate(undefined, {
      onSuccess: (res) => {
        showToast(
          'success',
          res.archived
            ? 'Conversation archived'
            : res.newOwnerId
              ? 'You left. Ownership transferred.'
              : 'You left the conversation'
        )
        router.push('/dashboard/chat/dm')
      },
      onError: (err: unknown) => {
        handleApiError(err, 'Failed to leave conversation')
      },
    })
  }

  return { handleLeave, leaveMut }
}
