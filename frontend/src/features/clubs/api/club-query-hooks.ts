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
} from './service';
import type {
  ClubDetailResponse,
  ClubInvitePreview,
  ClubInvitesResponse,
  ClubJoinRequestsResponse,
  ClubListResponse,
  ClubMembersResponse,
  ClubMineResponse,
} from './types';
import { clubKeys } from './club-keys';

export function useClubs(params?: ClubListParams) {
  return useQuery<ClubListResponse>({
    queryKey: clubKeys.list(params),
    queryFn: () => listClubs(params),
    staleTime: 30_000,
  });
}

export function useMyClubs() {
  return useQuery<ClubMineResponse>({
    queryKey: clubKeys.mine(),
    queryFn: listMyClubs,
    staleTime: 30_000,
  });
}

export function useRecommendedClubs(limit?: number) {
  return useQuery({
    queryKey: clubKeys.recommended(limit),
    queryFn: () => listRecommendedClubs(limit),
    staleTime: 60_000,
  });
}

export function useClubDetail(slug: string | null) {
  return useQuery<ClubDetailResponse>({
    queryKey: clubKeys.detail(slug ?? ''),
    queryFn: () => getClubBySlug(slug!),
    enabled: !!slug,
    staleTime: 30_000,
  });
}

export function usePendingClubs() {
  return useQuery({
    queryKey: clubKeys.pending(),
    queryFn: listPendingClubs,
    staleTime: 15_000,
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
    staleTime: 30_000,
  });
}

export function useClubJoinRequests(clubId: number | null) {
  return useQuery<ClubJoinRequestsResponse>({
    queryKey: clubKeys.requests(clubId!),
    queryFn: () => listClubJoinRequests(clubId!),
    enabled: !!clubId,
    staleTime: 15_000,
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
