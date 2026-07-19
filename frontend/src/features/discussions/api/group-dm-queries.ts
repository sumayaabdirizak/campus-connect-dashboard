import { useQuery } from '@/lib/async-query';
import { discussionKeys } from './discussion-keys';
import { getGroupDm, listGroupDms, searchGroupDmCandidates } from './service';

export const useGroupDms = () =>
  useQuery({
    queryKey: discussionKeys.groupDms(),
    queryFn: () => listGroupDms(),
    staleTime: 30_000
  });

export const useGroupDm = (groupDmId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.groupDm(Number(groupDmId)),
    queryFn: () => getGroupDm(Number(groupDmId)),
    enabled: Number.isFinite(Number(groupDmId)) && Number(groupDmId) > 0,
    staleTime: 30_000
  });

export const useGroupDmCandidates = (q: string) =>
  useQuery({
    queryKey: discussionKeys.groupDmCandidates(q),
    queryFn: () => searchGroupDmCandidates(q),
    staleTime: 60_000
  });
