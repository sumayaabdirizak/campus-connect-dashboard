import { apiClient } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@/lib/async-query';
import type {
  OfficeMessage,
  OfficeThreadDetail,
  OfficeThreadStatus,
  OfficeThreadSummary,
  SupportOffice
} from './office-types';

export const officeKeys = {
  all: ['offices'] as const,
  list: () => [...officeKeys.all, 'list'] as const,
  mine: () => [...officeKeys.all, 'threads', 'mine'] as const,
  thread: (id: number) => [...officeKeys.all, 'thread', id] as const,
  inbox: (slug: string, filter: string) => [...officeKeys.all, 'inbox', slug, filter] as const
};

export function useOffices() {
  return useQuery({
    queryKey: officeKeys.list(),
    queryFn: async () => {
      const data = await apiClient<SupportOffice[] | { offices?: SupportOffice[]; results?: SupportOffice[] }>(
        '/offices'
      );
      if (Array.isArray(data)) return data;
      return data.offices ?? data.results ?? [];
    }
  });
}

export function useMyOfficeThreads() {
  return useQuery({
    queryKey: officeKeys.mine(),
    queryFn: async () => {
      const data = await apiClient<
        OfficeThreadSummary[] | { threads?: OfficeThreadSummary[]; results?: OfficeThreadSummary[] }
      >('/offices/threads/mine');
      if (Array.isArray(data)) return data;
      return data.threads ?? data.results ?? [];
    },
    refetchInterval: 20000
  });
}

export function useOfficeThread(threadId: number | null) {
  return useQuery({
    queryKey: threadId ? officeKeys.thread(threadId) : ['offices', 'thread', 'none'],
    queryFn: () => apiClient<OfficeThreadDetail>(`/offices/threads/${threadId}`),
    enabled: threadId != null,
    // Light polling stands in for sockets in Phase 1.
    refetchInterval: 10000
  });
}

export function useOfficeInbox(slug: string | null, filter: string) {
  const qs =
    filter === 'unassigned'
      ? '?unassigned=true'
      : filter === 'mine'
        ? '?mine=true'
        : filter === 'resolved'
          ? '?status=RESOLVED'
          : '';
  return useQuery({
    queryKey: slug ? officeKeys.inbox(slug, filter) : ['offices', 'inbox', 'none'],
    queryFn: async () => {
      const data = await apiClient<
        OfficeThreadSummary[] | { threads?: OfficeThreadSummary[]; results?: OfficeThreadSummary[] }
      >(`/offices/${slug}/inbox${qs}`);
      if (Array.isArray(data)) return data;
      return data.threads ?? data.results ?? [];
    },
    enabled: slug != null,
    refetchInterval: 15000
  });
}

function invalidateThread(qc: ReturnType<typeof useQueryClient>, threadId: number) {
  qc.invalidateQueries({ queryKey: officeKeys.thread(threadId) });
  qc.invalidateQueries({ queryKey: officeKeys.mine() });
  qc.invalidateQueries({ queryKey: [...officeKeys.all, 'inbox'] });
}

export function useStartOfficeThread() {
  const qc = useQueryClient();
  return useMutation<OfficeThreadDetail, { slug: string; topic: string; message: string }>({
    mutationFn: ({ slug, topic, message }) =>
      apiClient<OfficeThreadDetail>(`/offices/${slug}/threads`, {
        method: 'POST',
        body: JSON.stringify({ topic, message })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: officeKeys.mine() })
  });
}

export function useSendOfficeMessage(threadId: number) {
  const qc = useQueryClient();
  return useMutation<OfficeMessage, { content: string; isInternalNote?: boolean }>({
    mutationFn: (input) =>
      apiClient<OfficeMessage>(`/offices/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    onSuccess: () => invalidateThread(qc, threadId)
  });
}

export function useClaimOfficeThread(threadId: number) {
  const qc = useQueryClient();
  return useMutation<unknown, void>({
    mutationFn: () =>
      apiClient(`/offices/threads/${threadId}/claim`, { method: 'POST', body: '{}' }),
    onSuccess: () => invalidateThread(qc, threadId)
  });
}

export function useSetOfficeThreadStatus(threadId: number) {
  const qc = useQueryClient();
  return useMutation<unknown, OfficeThreadStatus>({
    mutationFn: (status) =>
      apiClient(`/offices/threads/${threadId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    onSuccess: () => invalidateThread(qc, threadId)
  });
}
