/**
 * React-query hooks + key factory for the Clubs module.
 *
 * Components should import from this file (not from service.ts directly) so
 * that mutations stay in sync with the cache.
 */

import { useMutation, useQuery, useQueryClient } from '@/lib/async-query'
import { toast } from 'sonner'

import {
  acceptInvite,
  approveClub,
  createClub,
  createClubAsDean,
  createInvite,
  decideJoinRequest,
  demoteMember,
  editClub,
  getClubBySlug,
  getInvitePreview,
  getMyInterests,
  joinClub,
  kickMember,
  leaveClub,
  listClubJoinRequests,
  listClubMembers,
  listClubs,
  listInterestTags,
  listInvites,
  listMyClubs,
  listPendingClubs,
  listRecommendedClubs,
  promoteMember,
  rejectClub,
  revokeInvite,
  suspendClub,
  updateMyInterests,
  type ClubListParams
} from './service'
import type {
  AcceptInviteResponse,
  ClubDetailResponse,
  ClubInvitePreview,
  ClubInvitesResponse,
  ClubListResponse,
  ClubMembersResponse,
  ClubMineResponse,
  ClubJoinRequestsResponse,
  CreateClubPayload,
  EditClubPayload
} from './types'

// ────────────────────────────────────────────────────────────────────────────
// Key factory
// ────────────────────────────────────────────────────────────────────────────

export const clubKeys = {
  all: ['clubs'] as const,

  // Discovery
  list: (params?: ClubListParams) => [...clubKeys.all, 'list', params ?? {}] as const,
  mine: () => [...clubKeys.all, 'mine'] as const,
  recommended: (limit?: number) => [...clubKeys.all, 'recommended', limit] as const,
  detail: (slug: string) => [...clubKeys.all, 'detail', slug] as const,

  // Dean
  pending: () => [...clubKeys.all, 'pending'] as const,

  // Members & requests
  members: (clubId: number) => [...clubKeys.all, 'members', clubId] as const,
  requests: (clubId: number) => [...clubKeys.all, 'requests', clubId] as const,

  // Invites
  invites: (clubId: number) => [...clubKeys.all, 'invites', clubId] as const,
  invitePreview: (token: string) => [...clubKeys.all, 'invite-preview', token] as const,

  // Interest tags
  interestTags: () => [...clubKeys.all, 'interest-tags'] as const,
  myInterests: () => [...clubKeys.all, 'my-interests'] as const,
}

// ────────────────────────────────────────────────────────────────────────────
// Query hooks
// ────────────────────────────────────────────────────────────────────────────

export function useClubs(params?: ClubListParams) {
  return useQuery<ClubListResponse>({
    queryKey: clubKeys.list(params),
    queryFn: () => listClubs(params),
    staleTime: 30_000,
  })
}

export function useMyClubs() {
  return useQuery<ClubMineResponse>({
    queryKey: clubKeys.mine(),
    queryFn: listMyClubs,
    staleTime: 30_000,
  })
}

export function useRecommendedClubs(limit?: number) {
  return useQuery({
    queryKey: clubKeys.recommended(limit),
    queryFn: () => listRecommendedClubs(limit),
    staleTime: 60_000,
  })
}

export function useClubDetail(slug: string | null) {
  return useQuery<ClubDetailResponse>({
    queryKey: clubKeys.detail(slug ?? ''),
    queryFn: () => getClubBySlug(slug!),
    enabled: !!slug,
    staleTime: 30_000,
  })
}

export function usePendingClubs() {
  return useQuery({
    queryKey: clubKeys.pending(),
    queryFn: listPendingClubs,
    staleTime: 15_000,
  })
}

export function useClubMembers(clubId: number | null) {
  return useQuery<ClubMembersResponse>({
    queryKey: clubKeys.members(clubId!),
    queryFn: () => listClubMembers(clubId!),
    enabled: !!clubId,
    staleTime: 30_000,
  })
}

export function useClubJoinRequests(clubId: number | null) {
  return useQuery<ClubJoinRequestsResponse>({
    queryKey: clubKeys.requests(clubId!),
    queryFn: () => listClubJoinRequests(clubId!),
    enabled: !!clubId,
    staleTime: 15_000,
  })
}

export function useInterestTags() {
  return useQuery({
    queryKey: clubKeys.interestTags(),
    queryFn: listInterestTags,
    staleTime: 300_000, // 5 min — vocabulary changes rarely
  })
}

export function useMyInterests() {
  return useQuery({
    queryKey: clubKeys.myInterests(),
    queryFn: getMyInterests,
    staleTime: 60_000,
  })
}

export function useUpdateMyInterests() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tagSlugs: string[]) => updateMyInterests(tagSlugs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.myInterests() })
      qc.invalidateQueries({ queryKey: clubKeys.recommended() })
      toast.success('Interests updated!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update interests')
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Mutation hooks
// ────────────────────────────────────────────────────────────────────────────

export function useCreateClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateClubPayload) => createClub(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Club application submitted! Waiting for dean approval.')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create club')
    },
  })
}

export function useCreateClubAsDean() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateClubPayload) => createClubAsDean(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Club created successfully!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create club')
    },
  })
}

export function useApproveClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: number) => approveClub(clubId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.pending() })
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Club approved!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to approve club')
    },
  })
}

export function useRejectClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clubId, reason }: { clubId: number; reason?: string }) =>
      rejectClub(clubId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.pending() })
      toast.success('Club application rejected')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to reject club')
    },
  })
}

export function useSuspendClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clubId, reason }: { clubId: number; reason?: string }) =>
      suspendClub(clubId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Club suspended')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to suspend club')
    },
  })
}

export function useJoinClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: number) => joinClub(clubId),
    onSuccess: (_data, clubId) => {
      qc.invalidateQueries({ queryKey: clubKeys.mine() })
      qc.invalidateQueries({ queryKey: clubKeys.list() })
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to join club')
    },
  })
}

export function useLeaveClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: number) => leaveClub(clubId),
    onSuccess: (_data, clubId) => {
      qc.invalidateQueries({ queryKey: clubKeys.mine() })
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) })
      toast.success('You left the club')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to leave club')
    },
  })
}

export function useDecideJoinRequest(clubId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      requestId,
      approve,
      reason
    }: {
      requestId: number
      approve: boolean
      reason?: string
    }) => decideJoinRequest(clubId, requestId, approve, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.requests(clubId) })
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to process request')
    },
  })
}

export function useEditClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clubId, data }: { clubId: number; data: EditClubPayload }) =>
      editClub(clubId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Club updated')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update club')
    },
  })
}

export function usePromoteMember(clubId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => promoteMember(clubId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) })
      toast.success('Member promoted to moderator!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to promote member')
    },
  })
}

export function useDemoteMember(clubId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => demoteMember(clubId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) })
      toast.success('Moderator demoted')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to demote member')
    },
  })
}

export function useKickMember(clubId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => kickMember(clubId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) })
      toast.success('Member removed')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove member')
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Invite hooks
// ────────────────────────────────────────────────────────────────────────────

export function useClubInvites(clubId: number | null) {
  return useQuery<ClubInvitesResponse>({
    queryKey: clubKeys.invites(clubId!),
    queryFn: () => listInvites(clubId!),
    enabled: !!clubId,
    staleTime: 15_000,
  })
}

export function useInvitePreview(token: string | null) {
  return useQuery<ClubInvitePreview>({
    queryKey: clubKeys.invitePreview(token ?? ''),
    queryFn: () => getInvitePreview(token!),
    enabled: !!token,
    staleTime: 60_000,
  })
}

export function useCreateInvite(clubId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body?: { inviteeUserId?: number; expiresInHours?: number }) =>
      createInvite(clubId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.invites(clubId) })
      toast.success('Invite created!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create invite')
    },
  })
}

export function useRevokeInvite(clubId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: number) => revokeInvite(clubId, inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.invites(clubId) })
      toast.success('Invite revoked')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to revoke invite')
    },
  })
}

export function useAcceptInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => acceptInvite(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.mine() })
      qc.invalidateQueries({ queryKey: clubKeys.all })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to accept invite')
    },
  })
}
