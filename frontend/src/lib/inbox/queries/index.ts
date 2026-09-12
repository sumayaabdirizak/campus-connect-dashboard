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
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
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
