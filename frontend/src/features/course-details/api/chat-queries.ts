import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  deleteChatMessage,
  editChatMessage,
  getChatRoom,
  sendChatMessage,
  uploadChatAttachments
} from './chat-service';
import type { ChatRoom } from './chat-types';

export const chatKeys = {
  room: (courseOfferingId: string) => ['chat', courseOfferingId] as const
};

export function useChatRoom(courseOfferingId: string) {
  return useQuery({
    queryKey: chatKeys.room(courseOfferingId),
    queryFn: () => getChatRoom(courseOfferingId),
    refetchInterval: 30000
  });
}

export function useLoadOlderMessages(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (before: number) => getChatRoom(courseOfferingId, before),
    onSuccess: (older) => {
      queryClient.setQueryData<ChatRoom | undefined>(
        chatKeys.room(courseOfferingId),
        (prev) => {
          if (!prev) return older;
          const seen = new Set(prev.messages.map((m) => m.id));
          const merged = [...older.messages.filter((m) => !seen.has(m.id)), ...prev.messages];
          return { ...prev, messages: merged, nextCursor: older.nextCursor, hasMore: older.hasMore };
        }
      );
    }
  });
}

export function useSendChatMessage(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, replyToId }: { content: string; replyToId?: number | null }) =>
      sendChatMessage(courseOfferingId, content, replyToId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.room(courseOfferingId) });
    }
  });
}

export function useEditChatMessage(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: number; content: string }) =>
      editChatMessage(messageId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.room(courseOfferingId) });
    }
  });
}

export function useDeleteChatMessage(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) => deleteChatMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.room(courseOfferingId) });
    }
  });
}

export function useUploadChatAttachments(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, files }: { messageId: number; files: File[] }) =>
      uploadChatAttachments(messageId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.room(courseOfferingId) });
    }
  });
}
