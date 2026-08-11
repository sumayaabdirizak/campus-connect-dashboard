import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import { deleteChannelOverwrite, putChannelOverwrite } from '@/lib/discussions/queries/service';
import type {
  ChannelOverwritesResponse,
  DiscussionOverwrite,
  DiscussionOverwriteTarget
} from '@/lib/discussions/queries/types';

/**
 * Upsert a per-channel overwrite. Optimistically patches the local cache so
 * the 3-state grid in the Permissions tab reacts instantly. On error the
 * cache is rolled back and a toast surfaces the reason. On success the
 * server payload replaces the optimistic row (in case the backend masked
 * incoherent bits — `deny &= ~allow` etc).
 */
export const usePutChannelOverwrite = (channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      targetType: DiscussionOverwriteTarget;
      targetId: number;
      allow: string;
      deny: string;
    }) =>
      putChannelOverwrite(channelId, vars.targetType, vars.targetId, {
        allow: vars.allow,
        deny: vars.deny
      }),
    onMutate: (vars) => {
      const key = discussionKeys.channelOverwrites(channelId);
      const prev = qc.getQueryData<ChannelOverwritesResponse>(key);
      const optimistic: DiscussionOverwrite = {
        // Real id will arrive on success; use a synthetic negative id so
        // existing keys don't collide and rendering keeps a stable handle.
        id: prev?.results.find(
          (r) =>
            r.targetType === vars.targetType && r.targetId === vars.targetId
        )?.id ?? -vars.targetId,
        channelId,
        targetType: vars.targetType,
        targetId: vars.targetId,
        allow: vars.allow,
        deny: vars.deny
      };
      const merged: DiscussionOverwrite[] = prev
        ? [
            ...prev.results.filter(
              (r) =>
                !(
                  r.targetType === vars.targetType &&
                  r.targetId === vars.targetId
                )
            ),
            optimistic
          ]
        : [optimistic];
      qc.setQueryData<ChannelOverwritesResponse>(key, { results: merged });
      return { prev };
    },
    onError: (error: Error, _vars, context) => {
      const ctx = context as { prev?: ChannelOverwritesResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(
          discussionKeys.channelOverwrites(channelId),
          ctx.prev
        );
      }
      toast.error('Failed to save overwrite', { description: error.message });
    },
    onSuccess: (data) => {
      const key = discussionKeys.channelOverwrites(channelId);
      const cur = qc.getQueryData<ChannelOverwritesResponse>(key);
      const row = data.overwrite;
      const merged: DiscussionOverwrite[] = cur
        ? [
            ...cur.results.filter(
              (r) =>
                !(
                  r.targetType === row.targetType &&
                  r.targetId === row.targetId
                )
            ),
            row
          ]
        : [row];
      qc.setQueryData<ChannelOverwritesResponse>(key, { results: merged });
      // `myPermissions` on the channel detail derives from overwrites server
      // side, so the next channel fetch should re-evaluate it.
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
    }
  });
};

export const useDeleteChannelOverwrite = (channelId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      targetType: DiscussionOverwriteTarget;
      targetId: number;
      /** When true, skip the success toast (e.g. lock-channel cleanup). */
      quiet?: boolean;
    }) => deleteChannelOverwrite(channelId, vars.targetType, vars.targetId),
    onMutate: (vars) => {
      const key = discussionKeys.channelOverwrites(channelId);
      const prev = qc.getQueryData<ChannelOverwritesResponse>(key);
      if (prev) {
        qc.setQueryData<ChannelOverwritesResponse>(key, {
          results: prev.results.filter(
            (r) =>
              !(
                r.targetType === vars.targetType &&
                r.targetId === vars.targetId
              )
          )
        });
      }
      return { prev };
    },
    onError: (error: Error, _vars, context) => {
      const ctx = context as { prev?: ChannelOverwritesResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(
          discussionKeys.channelOverwrites(channelId),
          ctx.prev
        );
      }
      toast.error('Failed to remove overwrite', { description: error.message });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      if (!vars.quiet) {
        toast.success('Overwrite removed');
      }
    }
  });
};
