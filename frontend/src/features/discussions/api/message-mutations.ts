import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from './discussion-keys';
import {
  addReaction,
  deleteMessage,
  editMessage,
  removeReaction,
  sendChannelMessage
} from './service';
import type { EditMessagePayload, SendMessagePayload } from './types';

export const useSendChannelMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessagePayload) => sendChannelMessage(channelId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to send message', { description: error.message });
    }
  });
};

export const useEditMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: number; body: EditMessagePayload }) =>
      editMessage(messageId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to edit message', { description: error.message });
    }
  });
};

export const useDeleteMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) => deleteMessage(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete message', { description: error.message });
    }
  });
};

export const useAddReaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      addReaction(messageId, emoji),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.reactions(vars.messageId) });
    }
  });
};

export const useRemoveReaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      removeReaction(messageId, emoji),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.reactions(vars.messageId) });
    }
  });
};
