'use client';

import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import { DmMessageBubble } from './dm-message-bubble';
import { DmMessageEditView } from './dm-message-edit-view';
import { useDmMessageActions } from './use-dm-message-actions';

/**
 * DM message row — WhatsApp-style chat bubble.
 *
 * Your messages sit on the right in a green bubble; everyone else's on the
 * left in a neutral bubble (with their name, colored per-person, for group
 * DMs). Time + read-ticks live inside the bubble bottom-right.
 */
export function DmMessageRow({
  message,
  myUserId,
  myDisplayName,
  isOwner,
  showHeader,
  hideIdentity,
  onOptimisticPatch,
  onOptimisticReactionToggle,
  tickStatus,
  onReply,
}: {
  message: DiscussionMessage;
  myUserId: number | null;
  myDisplayName?: string | null;
  isOwner: boolean;
  showHeader: boolean;
  hideIdentity?: boolean;
  onOptimisticPatch?: (
    messageId: string,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  onOptimisticReactionToggle?: (
    messageId: string,
    emoji: string,
    myUserId: number,
    myDisplayName: string
  ) => { wasAdding: boolean };
  tickStatus?: 'seen' | 'sent' | null;
  onReply?: (message: DiscussionMessage) => void;
}) {
  const {
    isEditing,
    setIsEditing,
    editValue,
    setEditValue,
    editTextareaRef,
    editMutation,
    submitEdit,
    handleDelete,
    onToggleReaction,
    startEdit,
  } = useDmMessageActions({
    message,
    myUserId,
    myDisplayName,
    onOptimisticPatch,
    onOptimisticReactionToggle,
  });

  const isAuthor = myUserId != null && message.senderId === myUserId;
  const isDeleted = !!message.deletedAt;
  const isPending = message.id.startsWith('temp-');

  if (isEditing) {
    return (
      <DmMessageEditView
        isAuthor={isAuthor}
        editValue={editValue}
        setEditValue={setEditValue}
        editTextareaRef={editTextareaRef}
        submitEdit={submitEdit}
        setIsEditing={setIsEditing}
        isPending={editMutation.isPending}
      />
    );
  }

  return (
    <DmMessageBubble
      message={message}
      isAuthor={isAuthor}
      isOwner={isOwner}
      isDeleted={isDeleted}
      isPending={isPending}
      myUserId={myUserId}
      showHeader={showHeader}
      hideIdentity={hideIdentity}
      tickStatus={tickStatus}
      onToggleReaction={onToggleReaction}
      onStartEdit={startEdit}
      onDelete={handleDelete}
      onReply={
        !isDeleted && !isPending && onReply
          ? () => onReply(message)
          : undefined
      }
    />
  );
}
