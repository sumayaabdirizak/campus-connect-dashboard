'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/features/ui/components/button';
import { Textarea } from '@/features/ui/components/textarea';
import { cn } from '@/lib/utils';
import {
  useAddReaction,
  useDeleteMessage,
  useEditMessage,
  useRemoveReaction
} from '@/lib/discussions/queries/queries';
import { confirmDelete } from '@/lib/notifications';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import { serverNowIso } from '@/lib/format-time';

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
    messageId: string,
    patch: Partial<DiscussionMessage>
  ) => () => void;
  onOptimisticReactionToggle?: (
    messageId: string,
    emoji: string,
    myUserId: number,
    myDisplayName: string
  ) => { wasAdding: boolean };
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content ?? '');
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editMutation = useEditMessage('');
  const deleteMutation = useDeleteMessage('');
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  useEffect(() => {
    if (isEditing) {
      editTextareaRef.current?.focus();
      const length = editTextareaRef.current?.value?.length ?? 0;
      editTextareaRef.current?.setSelectionRange(length, length);
    }
  }, [isEditing]);

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

  const handleDelete = async () => {
    if (!(await confirmDelete('this message'))) return;
    if (onOptimisticPatch) {
      const revert = onOptimisticPatch(message.id, {
        deletedAt: serverNowIso()
      });
      deleteMutation.mutate(message.id, {
        onError: () => revert()
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
