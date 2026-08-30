'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useAddReaction,
  useEditMessage,
  useRemoveReaction
} from '@/lib/discussions/queries/queries';
import { getDiscussionMessagePlaintext } from '@/lib/discussions/services/decode-web-e2e-ciphertext';
import { serverNowIso } from '@/lib/format-time';
import type { MessageRowProps } from './types';

export function useMessageRow({
  message,
  channelId,
  myUserId,
  myDisplayName,
  onOptimisticReactionToggle,
  onOptimisticPatch
}: Pick<
  MessageRowProps,
  | 'message'
  | 'channelId'
  | 'myUserId'
  | 'myDisplayName'
  | 'onOptimisticReactionToggle'
  | 'onOptimisticPatch'
>) {
  const messagePlaintext =
    getDiscussionMessagePlaintext({
      content: message.content,
      ciphertext: message.ciphertext,
      messageType: message.messageType
    }) ?? '';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(messagePlaintext);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editMutation = useEditMessage(channelId);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  useEffect(() => {
    if (isEditing) {
      editTextareaRef.current?.focus();
      const length = editTextareaRef.current?.value?.length ?? 0;
      editTextareaRef.current?.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const isAuthor = myUserId != null && message.senderId === myUserId;
  const senderName = message.isAnonymous
    ? 'Anonymous'
    : message.sender?.full_name ?? 'Unknown';
  const isDeleted = !!message.deletedAt;
  const isPending = message.id.startsWith('temp-');

  const onToggleReaction = (messageId: string, emoji: string) => {
    if (myUserId == null) return;
    const displayName = myDisplayName ?? '';
    if (onOptimisticReactionToggle) {
      const { wasAdding } = onOptimisticReactionToggle(
        messageId,
        emoji,
        myUserId,
        displayName
      );
      const revert = () =>
        onOptimisticReactionToggle(messageId, emoji, myUserId, displayName);
      if (wasAdding) {
        addReaction.mutate({ messageId, emoji }, { onError: revert });
      } else {
        removeReaction.mutate({ messageId, emoji }, { onError: revert });
      }
      return;
    }
    const mine =
      message.reactions?.some(
        (r) => r.emoji === emoji && Number(r.userId) === myUserId
      ) ?? false;
    if (mine) removeReaction.mutate({ messageId, emoji });
    else addReaction.mutate({ messageId, emoji });
  };

  const startEdit = () => {
    setEditValue(messagePlaintext);
    setIsEditing(true);
  };

  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed === messagePlaintext.trim()) {
      setIsEditing(false);
      return;
    }
    if (onOptimisticPatch) {
      setIsEditing(false);
      const previousValue = editValue;
      const revert = onOptimisticPatch(message.id, {
        content: trimmed,
        editedAt: serverNowIso()
      });
      editMutation.mutate(
        { messageId: message.id, body: { content: trimmed || null } },
        {
          onError: () => {
            revert();
            setEditValue(previousValue);
            setIsEditing(true);
          }
        }
      );
      return;
    }
    editMutation.mutate(
      { messageId: message.id, body: { content: trimmed || null } },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  return {
    isEditing,
    setIsEditing,
    editValue,
    setEditValue,
    editTextareaRef,
    editPending: editMutation.isPending,
    isAuthor,
    senderName,
    isDeleted,
    isPending,
    onToggleReaction,
    startEdit,
    submitEdit
  };
}

