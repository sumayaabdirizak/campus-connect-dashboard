import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import { muteServerMember, removeServerMember } from '@/lib/discussions/queries/service';
import type { ChannelMembersResponse } from '@/lib/discussions/queries/types';

export const useRemoveServerMember = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      removeServerMember(serverId, targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      qc.invalidateQueries({ queryKey: discussionKeys.serverPresence(serverId) });
      qc.invalidateQueries({ queryKey: [...discussionKeys.all, 'channel'] });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove member', { description: error.message });
    }
  });
};

/**
 * Kick a member, scoped to a channel-members view so the row vanishes
 * optimistically. Used by the Manage Channel → Members tab.
 *
 * Mirrors `useRemoveServerMember` but adds an optimistic snapshot/rollback
 * around the `channelMembers(channelId)` cache so the list reacts the moment
 * the dean clicks Confirm.
 */
export const useKickServerMember = (serverId: string, channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      removeServerMember(serverId, targetUserId, channelId),
    onMutate: (targetUserId: number) => {
      const key = discussionKeys.channelMembers(channelId);
      const prev = qc.getQueryData<ChannelMembersResponse>(key);
      if (!prev) return { prev: undefined };
      qc.setQueryData<ChannelMembersResponse>(key, {
        results: prev.results.filter(
          (m) => Number(m.userId) !== Number(targetUserId)
        )
      });
      return { prev };
    },
    onError: (error, _vars, context) => {
      const ctx = context as { prev?: ChannelMembersResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(discussionKeys.channelMembers(channelId), ctx.prev);
      }
      toast.error('Failed to remove member', {
        description: (error as Error).message
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      qc.invalidateQueries({ queryKey: discussionKeys.serverPresence(serverId) });
      qc.invalidateQueries({
        queryKey: discussionKeys.channelMembers(channelId)
      });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      toast.success('Member removed');
    }
  });
};

/**
 * Mute (or lift the mute on) a server member.
 *
 * `until` is an ISO timestamp in the future, or `null` to lift the mute.
 * Backend rejects past timestamps and refuses to mute the server owner; we
 * surface those as toast errors.
 *
 * The endpoint doesn't yet return `mutedUntil` on the channel-members row,
 * so the visible list shape is unchanged — we just give instant toast
 * feedback and invalidate the surrounding caches for correctness.
 */
export const useMuteServerMember = (serverId: string, channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      targetUserId,
      until
    }: {
      targetUserId: number;
      until: string | null;
    }) => muteServerMember(serverId, targetUserId, until, channelId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: discussionKeys.channelMembers(channelId)
      });
      qc.invalidateQueries({ queryKey: discussionKeys.serverPresence(serverId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      if (vars.until == null) {
        toast.success('Mute lifted');
      } else {
        toast.success('Member muted');
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to update mute', { description: error.message });
    }
  });
};
