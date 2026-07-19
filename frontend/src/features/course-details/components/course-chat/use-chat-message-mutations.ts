'use client';

import { type ChangeEvent, useRef, useState } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { showToast } from '@/lib/notifications';
import {
  chatKeys,
  useEditChatMessage,
  useSendChatMessage,
  useUploadChatAttachments
} from '../../api/chat-queries';
import type { ChatMessage, ChatRoom } from '../../api/chat-types';
import { deleteChatMessage as deleteChatMessageCall } from '../../api/chat-service';
import { useDeleteWithUndo } from '../_shared/use-delete-with-undo';

export function useChatMessageMutations(courseId: string) {
  const sendViaHttp = useSendChatMessage(courseId);
  const editMutation = useEditChatMessage(courseId);
  const uploadMutation = useUploadChatAttachments(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startEdit = (item: ChatMessage) => {
    setEditingId(item.id);
    setEditDraft(item.content);
  };

  const saveEdit = () => {
    const trimmed = editDraft.trim();
    if (editingId == null || !trimmed) return;
    editMutation.mutate(
      { messageId: editingId, content: trimmed },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const undoDeleteMessage = (item: ChatMessage) => {
    const key = chatKeys.room(courseId);
    const snapshot = queryClient.getQueryData<ChatRoom>(key);
    if (!snapshot) return;
    const preview =
      item.content.length > 40 ? `${item.content.slice(0, 40)}...` : item.content;
    runDelete({
      label: `Message deleted - "${preview}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<ChatRoom>(key, (previous) =>
          previous
            ? {
                ...previous,
                messages: previous.messages.filter((m) => m.id !== item.id)
              }
            : previous!
        );
      },
      restore: () => queryClient.setQueryData<ChatRoom>(key, () => snapshot),
      commit: () => deleteChatMessageCall(item.id)
    });
  };

  const pickFiles = (
    event: ChangeEvent<HTMLInputElement>,
    opts: {
      message: string;
      replyToId: number | null;
      clearComposer: () => void;
    }
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    const oversized = files.find((file) => file.size > 10 * 1024 * 1024);
    if (oversized) {
      showToast('warning', 'File too large', `"${oversized.name}" exceeds the 10 MB limit`);
      return;
    }
    const content =
      opts.message.trim() ||
      `Shared ${files.length} file${files.length === 1 ? '' : 's'}`;
    sendViaHttp.mutate(
      { content, replyToId: opts.replyToId },
      {
        onSuccess: (created) => {
          uploadMutation.mutate({ messageId: created.id, files });
        }
      }
    );
    opts.clearComposer();
  };

  return {
    sendViaHttp,
    editMutation,
    uploadMutation,
    editingId,
    setEditingId,
    editDraft,
    setEditDraft,
    startEdit,
    saveEdit,
    undoDeleteMessage,
    pickFiles,
    fileInputRef
  };
}
