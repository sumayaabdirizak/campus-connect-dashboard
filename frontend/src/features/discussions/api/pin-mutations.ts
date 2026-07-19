import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from './discussion-keys';
import { pinMessage, unpinMessage } from './service';
import type {
  ChannelPin,
  ChannelPinsResponse,
  DiscussionMessage
} from './types';

/**
 * Pin a message with optimistic insertion into the channel-pins cache.
 * Caller passes the full `message` so we can render its preview in the
 * pinned strip immediately (otherwise we'd show "(loading)" until the
 * refetch). Synthetic pin id is negative so the next refetch's real id
 * cleanly displaces it.
 */
export const usePinMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId }: { messageId: number; message?: DiscussionMessage }) =>
      pinMessage(channelId, messageId),
    onMutate: ({
      messageId,
      message
    }: {
      messageId: number;
      message?: DiscussionMessage;
    }) => {
      const key = discussionKeys.channelPins(channelId);
      const prev = qc.getQueryData<ChannelPinsResponse>(key);
      if (!prev) return { prev: undefined };
      const synthetic: ChannelPin = {
        id: -Date.now(),
        groupId: 0,
        messageId,
        pinnedAt: new Date().toISOString(),
        message:
          message ??
          ({
            id: messageId,
            channelId,
            senderId: null,
            content: null,
            messageType: 'TEXT',
            createdAt: new Date().toISOString()
          } as DiscussionMessage),
        pinnedBy: null
      };
      qc.setQueryData<ChannelPinsResponse>(key, {
        results: [synthetic, ...prev.results]
      });
      return { prev };
    },
    onError: (error, _vars, context) => {
      const ctx = context as { prev?: ChannelPinsResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(discussionKeys.channelPins(channelId), ctx.prev);
      }
      toast.error('Failed to pin message', { description: error.message });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channelPins(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
    }
  });
};

export const useUnpinMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) => unpinMessage(channelId, messageId),
    onMutate: (messageId: number) => {
      const key = discussionKeys.channelPins(channelId);
      const prev = qc.getQueryData<ChannelPinsResponse>(key);
      if (!prev) return { prev: undefined };
      qc.setQueryData<ChannelPinsResponse>(key, {
        results: prev.results.filter((p) => p.messageId !== messageId)
      });
      return { prev };
    },
    onError: (error, _vars, context) => {
      const ctx = context as { prev?: ChannelPinsResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(discussionKeys.channelPins(channelId), ctx.prev);
      }
      toast.error('Failed to unpin message', { description: error.message });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channelPins(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
    }
  });
};
