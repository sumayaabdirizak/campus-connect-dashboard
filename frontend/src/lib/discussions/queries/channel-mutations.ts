import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import {
  archiveChannel,
  createChannel,
  hardDeleteChannel,
  unarchiveChannel,
  updateChannel
} from '@/lib/discussions/queries/service';

export const useUpdateChannel = (channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      topic?: string | null;
      categoryId?: string | null;
      position?: number;
      kind?: 'TEXT' | 'ANNOUNCEMENT' | 'FORUM';
      isPrivate?: boolean;
      slowModeSeconds?: number;
    }) => updateChannel(channelId, body),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      // Category/position/visibility changes affect the channel list that
      // the sidebar renders out of the server-detail query, so refresh
      // that too. `kind` changes the icon, which also lives on that row.
      const touchesServerList =
        vars.categoryId !== undefined ||
        vars.position !== undefined ||
        vars.kind !== undefined ||
        vars.isPrivate !== undefined;
      if (touchesServerList) {
        const serverId = (data as { channel?: { serverId?: string } })?.channel?.serverId;
        if (serverId) {
          qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
          qc.invalidateQueries({
            queryKey: discussionKeys.serverChannels(serverId)
          });
        } else {
          qc.invalidateQueries({ queryKey: discussionKeys.all });
        }
      }
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to update channel', { description: error.message });
    }
  });
};

export const useArchiveChannel = (channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (archived: boolean) =>
      archived ? archiveChannel(channelId) : unarchiveChannel(channelId),
    onSuccess: (_data, archived) => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      // Server detail caches the channel list — refresh so the sidebar
      // hides/shows it accordingly.
      qc.invalidateQueries({ queryKey: discussionKeys.all });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      toast.success(archived ? 'Channel archived' : 'Channel restored');
    },
    onError: (error: Error) => {
      toast.error('Failed to update channel', { description: error.message });
    }
  });
};

export const useHardDeleteChannel = (channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serverId: string) =>
      hardDeleteChannel(channelId).then(() => serverId),
    onSuccess: (serverId) => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      qc.invalidateQueries({
        queryKey: discussionKeys.serverChannels(serverId)
      });
      qc.invalidateQueries({ queryKey: discussionKeys.all });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      toast.success('Channel deleted permanently');
    },
    onError: (error: Error) => {
      toast.error('Could not delete channel', { description: error.message });
    }
  });
};

export const useCreateChannel = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; topic?: string | null; categoryId?: string }) =>
      createChannel(serverId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      qc.invalidateQueries({ queryKey: discussionKeys.serverChannels(serverId) });
      toast.success('Channel created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create channel', { description: error.message });
    }
  });
};
