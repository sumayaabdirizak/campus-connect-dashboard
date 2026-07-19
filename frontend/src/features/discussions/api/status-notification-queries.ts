import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from './discussion-keys';
import {
  getMyDiscussionStatus,
  markNotificationsRead,
  updateMyDiscussionStatus
} from './service';
import type { MarkReadPayload } from './types';

export const useMyDiscussionStatus = () =>
  useQuery({
    queryKey: discussionKeys.myStatus(),
    queryFn: () => getMyDiscussionStatus(),
    staleTime: 60_000
  });

export const useUpdateMyDiscussionStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string | null) => updateMyDiscussionStatus(status),
    onMutate: (status: string | null) => {
      // Optimistic — flip the local cache so the user footer updates instantly.
      const prev = qc.getQueryData<{ discussionCustomStatus: string | null }>(
        discussionKeys.myStatus()
      );
      qc.setQueryData(discussionKeys.myStatus(), {
        discussionCustomStatus: status?.trim() || null
      });
      return prev;
    },
    onError: (_err, _vars, context) => {
      const prev = context as
        | { discussionCustomStatus: string | null }
        | undefined;
      if (prev !== undefined) {
        qc.setQueryData(discussionKeys.myStatus(), prev);
      }
      toast.error('Failed to update status');
    },
    onSuccess: (data) => {
      qc.setQueryData(discussionKeys.myStatus(), data);
    }
  });
};

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkReadPayload) => markNotificationsRead(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.unreadCount() });
      qc.invalidateQueries({ queryKey: [...discussionKeys.all, 'notifications'] });
    }
  });
};
