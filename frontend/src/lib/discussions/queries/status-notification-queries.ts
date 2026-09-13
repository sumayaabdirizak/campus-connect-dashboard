import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import {
  getMyDiscussionStatus,
  updateMyDiscussionStatus
} from '@/lib/discussions/queries/service';

// Re-export notification mutation from lib/notifications for backward compatibility
export { useMarkNotificationsRead } from '@/lib/notifications/queries';

/** Discussion-specific custom status (not a notification). */
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
