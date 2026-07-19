'use client';

import { useEffect, useRef, useState } from 'react';
import { confirmDelete } from '@/lib/notifications';
import {
  useAddReaction,
  useDeleteMessage,
  useEditMessage,
  useRemoveReaction,
} from '../../../api/queries';
import type { DiscussionMessage } from '../../../api/types';

export function useDmMessageActions({
  message,
  myUserId,
  myDisplayName,
  onOptimisticPatch,
  onOptimisticReactionToggle,
}: {
  message: DiscussionMessage;
  myUserId: number | null;
  myDisplayName?: string | null;
  onOptimisticPatch?: (
    messageId: number,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  onOptimisticReactionToggle?: (
    messageId: number,
    emoji: string,
    myUserId: number,
    myDisplayName: string
  ) => { wasAdding: boolean };
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content ?? '');
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editMutation = useEditMessage(0);
  const deleteMutation = useDeleteMessage(0);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  useEffect(() => {
    if (isEditing) {
      editTextareaRef.current?.focus();
      const length = editTextareaRef.current?.value?.length ?? 0;
      editTextareaRef.current?.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const onToggleReaction = (messageId: number, emoji: string) => {
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

  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed === (message.content ?? '').trim()) {
      setIsEditing(false);
      return;
    }
    if (onOptimisticPatch) {
      setIsEditing(false);
      const previousValue = editValue;
      const revert = onOptimisticPatch(message.id, {
        content: trimmed,
        editedAt: new Date().toISOString(),
      });
      editMutation.mutate(
        { messageId: message.id, body: { content: trimmed || null } },
        {
          onError: () => {
            revert();
            setEditValue(previousValue);
            setIsEditing(true);
          },
        }
      );
      return;
    }
    editMutation.mutate(
      { messageId: message.id, body: { content: trimmed || null } },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleDelete = async () => {
    if (!(await confirmDelete('this message'))) return;
    if (onOptimisticPatch) {
      const revert = onOptimisticPatch(message.id, {
        deletedAt: new Date().toISOString(),
      });
      deleteMutation.mutate(message.id, {
        onError: () => revert(),
      });
      return;
    }
    deleteMutation.mutate(message.id);
  };

  const startEdit = () => {
    setEditValue(message.content ?? '');
    setIsEditing(true);
  };

  return {
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
  };
}
