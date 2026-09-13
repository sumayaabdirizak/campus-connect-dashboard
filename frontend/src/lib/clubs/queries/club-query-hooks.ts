import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';

import {
  getClubBySlug,
  getInvitePreview,
  getMyInterests,
  listClubJoinRequests,
  listClubMembers,
  listClubs,
  listInterestTags,
  listInvites,
  listMyClubs,
  listAllFacultyClubs,
  listPendingClubs,
  listRecommendedClubs,
  updateMyInterests,
  type ClubListParams,
} from '@/lib/clubs/services';
import type {
  ClubDetailResponse,
  ClubInvitePreview,
  ClubInvitesResponse,
  ClubJoinRequestsResponse,
  ClubListResponse,
  ClubMembersResponse,
  ClubMineResponse,
} from '@/lib/clubs/types';
import { clubKeys } from './club-keys';
import { CLUB_REFETCH_INTERVAL, CLUB_STALE_MS } from './club-query-config';

const clubLive = {
  staleTime: CLUB_STALE_MS,
  refetchOnWindowFocus: true,
  refetchInterval: CLUB_REFETCH_INTERVAL,
} as const;

export function useClubs(params?: ClubListParams) {
  return useQuery<ClubListResponse>({
    queryKey: clubKeys.list(params),
    queryFn: () => listClubs(params),
    ...clubLive,
  });
}

export function useMyClubs() {
  return useQuery<ClubMineResponse>({
    queryKey: clubKeys.mine(),
    queryFn: listMyClubs,
    ...clubLive,
  });
}

export function useRecommendedClubs(limit?: number) {
  return useQuery({
    queryKey: clubKeys.recommended(limit),
    queryFn: () => listRecommendedClubs(limit),
    ...clubLive,
  });
}

export function useClubDetail(slug: string | null) {
  return useQuery<ClubDetailResponse>({
    queryKey: clubKeys.detail(slug ?? ''),
    queryFn: () => getClubBySlug(slug!),
    enabled: !!slug,
    ...clubLive,
  });
}

export function usePendingClubs() {
  return useQuery({
    queryKey: clubKeys.pending(),
    queryFn: listPendingClubs,
    ...clubLive,
  });
}

export function useAllFacultyClubs(status?: string) {
  return useQuery({
    queryKey: clubKeys.allFaculty(status),
    queryFn: () => listAllFacultyClubs(status),
    staleTime: 15_000,
  });
}

export function useClubMembers(clubId: number | null) {
  return useQuery<ClubMembersResponse>({
    queryKey: clubKeys.members(clubId!),
    queryFn: () => listClubMembers(clubId!),
    enabled: !!clubId,
    ...clubLive,
  });
}

export function useClubJoinRequests(clubId: number | null) {
  return useQuery<ClubJoinRequestsResponse>({
    queryKey: clubKeys.requests(clubId!),
    queryFn: () => listClubJoinRequests(clubId!),
    enabled: !!clubId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: CLUB_REFETCH_INTERVAL,
  });
}

export function useInterestTags() {
  return useQuery({
    queryKey: clubKeys.interestTags(),
    queryFn: listInterestTags,
    staleTime: 300_000,
  });
}

export function useMyInterests() {
  return useQuery({
    queryKey: clubKeys.myInterests(),
    queryFn: getMyInterests,
    staleTime: 60_000,
  });
}

export function useUpdateMyInterests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagSlugs: string[]) => updateMyInterests(tagSlugs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.myInterests() });
      qc.invalidateQueries({ queryKey: clubKeys.recommended() });
      toast.success('Interests updated!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update interests');
    },
  });
}

export function useClubInvites(clubId: number | null) {
  return useQuery<ClubInvitesResponse>({
    queryKey: clubKeys.invites(clubId!),
    queryFn: () => listInvites(clubId!),
    enabled: !!clubId,
    staleTime: 15_000,
  });
}

export function useInvitePreview(token: string | null) {
  return useQuery<ClubInvitePreview>({
    queryKey: clubKeys.invitePreview(token ?? ''),
    queryFn: () => getInvitePreview(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}
