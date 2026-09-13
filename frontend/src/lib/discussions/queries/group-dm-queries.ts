import { useQuery } from '@/lib/async-query';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import { getGroupDm, listGroupDms, searchGroupDmCandidates } from '@/lib/discussions/queries/service';

export const useGroupDms = () =>
  useQuery({
    queryKey: discussionKeys.groupDms(),
    queryFn: () => listGroupDms(),
    staleTime: 30_000
  });

export const useGroupDm = (groupDmId: string | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.groupDm(groupDmId ?? ''),
    queryFn: () => getGroupDm(groupDmId as string),
    enabled: !!groupDmId,
    staleTime: 30_000
  });

export const useGroupDmCandidates = (
  q: string,
  purpose: 'direct' | 'group' = 'direct',
  enabled = true
) =>
  useQuery({
    queryKey: discussionKeys.groupDmCandidates(q, purpose),
    queryFn: () => searchGroupDmCandidates(q, purpose),
    enabled,
    staleTime: 60_000
  });
