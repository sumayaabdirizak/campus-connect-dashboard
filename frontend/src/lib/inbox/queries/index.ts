import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import type { InboxResponse, DirectDmResult } from '../types';

export const inboxKeys = {
  all: ['inbox'] as const
};

/** The unified inbox feed — groups + DMs + office threads, recency-sorted. */
export function useInbox() {
  return useQuery({
    queryKey: inboxKeys.all,
    queryFn: () => apiClient<InboxResponse>('/inbox'),
    staleTime: 0,
    refetchOnWindowFocus: true,
    // Light polling stands in for a dedicated inbox socket in this phase; the
    // underlying conversations already update in realtime once opened.
    refetchInterval: 10_000
  });
}

/** Get-or-create a 1:1 DM with a user, then the caller navigates to it. */
export function useStartDirectDm() {
  const qc = useQueryClient();
  return useMutation<DirectDmResult, number>({
    mutationFn: (targetUserId) =>
      apiClient<DirectDmResult>('/discussions/group-dms/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.all })
  });
}
