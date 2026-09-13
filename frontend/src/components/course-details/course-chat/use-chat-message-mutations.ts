'use client';

import { type ChangeEvent, useRef, useState } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { showToast } from '@/lib/notifications';
import {
  chatKeys,
  useEditChatMessage,
  useSendChatMessage,
  useUploadChatAttachments
} from '@/lib/course-details/queries/chat-queries';
import type { ChatMessage, ChatRoom } from '@/lib/course-details/types';
import { deleteChatMessage as deleteChatMessageCall } from '@/lib/course-details/services/chat-service';
import { useDeleteWithUndo } from '../_shared/use-delete-with-undo';
import type { DisplayChatFile } from './chat-file-utils';

function pendingFilesFromList(files: File[]): DisplayChatFile[] {
  return files.map((file, i) => ({
    id: `pending-${Date.now()}-${i}`,
    name: file.name,
    size: file.size,
    mimeType: file.type || null,
    pending: true,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
  }));
}

function revokePendingPreviews(files: DisplayChatFile[]) {
  for (const f of files) {
    if (f.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(f.previewUrl);
  }
}

export function useChatMessageMutations(courseId: string) {
  const sendViaHttp = useSendChatMessage(courseId);
  const editMutation = useEditChatMessage(courseId);
  const uploadMutation = useUploadChatAttachments(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pendingByMessageId, setPendingByMessageId] = useState<
    Map<number, DisplayChatFile[]>
  >(() => new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const clearPending = (messageId: number) => {
    setPendingByMessageId((prev) => {
      const next = new Map(prev);
      const pending = next.get(messageId);
      if (pending) {
        revokePendingPreviews(pending);
        next.delete(messageId);
      }
      return next;
    });
  };

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

    const pendingPreview = pendingFilesFromList(files);
    const content = opts.message.trim();

    sendViaHttp.mutate(
      { content, replyToId: opts.replyToId },
      {
        onSuccess: (created) => {
          setPendingByMessageId((prev) => new Map(prev).set(created.id, pendingPreview));
          uploadMutation.mutate(
            { messageId: created.id, files },
            {
              onError: () => {
                showToast('error', 'Could not upload file(s). Try again.');
              },
              onSettled: () => clearPending(created.id)
            }
          );
        },
        onError: () => {
          revokePendingPreviews(pendingPreview);
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
    fileInputRef,
    pendingByMessageId
  };
}
