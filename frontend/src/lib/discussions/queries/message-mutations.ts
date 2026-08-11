import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import {
  addReaction,
  deleteMessage,
  editMessage,
  removeReaction,
  sendChannelMessage
} from '@/lib/discussions/queries/service';
import type { EditMessagePayload, SendMessagePayload } from '@/lib/discussions/queries/types';

export const useSendChannelMessage = (channelId: string) => {
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

export const useEditMessage = (channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: EditMessagePayload }) =>
      editMessage(messageId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to edit message', { description: error.message });
    }
  });
};

export const useDeleteMessage = (channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(messageId),
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
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      addReaction(messageId, emoji),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.reactions(vars.messageId) });
    }
  });
};

export const useRemoveReaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      removeReaction(messageId, emoji),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.reactions(vars.messageId) });
    }
  });
};
