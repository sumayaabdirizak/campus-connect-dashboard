/**
 * Thin fetch wrappers around /api/clubs/*.
 *
 * Pure functions — no caching, no React. The cache layer lives in
 * api/queries.ts. Components should import from queries.ts; this file
 * exists so server components and tests can call the endpoints directly.
 */

import { apiClient } from '@/lib/api-client'
import type {
  AcceptInviteResponse,
  ClubCreateResponse,
  ClubDetailResponse,
  ClubInvitePreview,
  ClubInvitesResponse,
  ClubJoinRequestsResponse,
  ClubListResponse,
  ClubMembersResponse,
  ClubMineResponse,
  CreateClubPayload,
  EditClubPayload,
  InterestTagsResponse,
  UserInterestsResponse
} from './types'

// ────────────────────────────────────────────────────────────────────────────
// Discovery
// ────────────────────────────────────────────────────────────────────────────

export type ClubListParams = {
  scope?: string
  facultyId?: number
  interest?: string
  q?: string
  sort?: 'new' | 'popular' | 'active'
  cursor?: number
  limit?: number
}

export const listClubs = (params?: ClubListParams) => {
  const qs = new URLSearchParams()
  if (params?.scope) qs.set('scope', params.scope)
  if (params?.facultyId) qs.set('facultyId', String(params.facultyId))
  if (params?.interest) qs.set('interest', params.interest)
  if (params?.q) qs.set('q', params.q)
  if (params?.sort) qs.set('sort', params.sort)
  if (params?.cursor) qs.set('cursor', String(params.cursor))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return apiClient<ClubListResponse>(`/clubs${query ? `?${query}` : ''}`)
}

export const listMyClubs = () =>
  apiClient<ClubMineResponse>('/clubs/mine')

export const listRecommendedClubs = (limit?: number) =>
  apiClient<{ clubs: ClubCreateResponse['club'][] }>(
    `/clubs/recommended${limit ? `?limit=${limit}` : ''}`
  )

export const getClubBySlug = (slug: string) =>
  apiClient<ClubDetailResponse>(`/clubs/${encodeURIComponent(slug)}`)

// ────────────────────────────────────────────────────────────────────────────
// Creation
// ────────────────────────────────────────────────────────────────────────────

export const createClub = (body: CreateClubPayload) =>
  apiClient<ClubCreateResponse>('/clubs', {
    method: 'POST',
    body: JSON.stringify(body)
  })

export const createClubAsDean = (body: CreateClubPayload) =>
  apiClient<ClubCreateResponse>('/clubs?as=dean', {
    method: 'POST',
    body: JSON.stringify(body)
  })

// ────────────────────────────────────────────────────────────────────────────
// Dean moderation
// ────────────────────────────────────────────────────────────────────────────

export const listPendingClubs = () =>
  apiClient<{ clubs: ClubCreateResponse['club'][] }>('/clubs/dean/pending')

export const listAllFacultyClubs = (status?: string) =>
  apiClient<{ clubs: ClubCreateResponse['club'][] }>(
    `/clubs/dean/all${status ? `?status=${status}` : ''}`
  )

export const approveClub = (clubId: number) =>
  apiClient<ClubCreateResponse>(`/clubs/${clubId}/approve`, { method: 'POST' })

export const rejectClub = (clubId: number, reason?: string) =>
  apiClient<{ club: ClubCreateResponse['club'] }>(`/clubs/${clubId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  })

export const suspendClub = (clubId: number, reason?: string) =>
  apiClient<{ club: ClubCreateResponse['club'] }>(`/clubs/${clubId}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  })

// ────────────────────────────────────────────────────────────────────────────
// Membership
// ────────────────────────────────────────────────────────────────────────────

export const joinClub = (clubId: number) =>
  apiClient<{ membership?: unknown; joinRequest?: unknown; status: string }>(
    `/clubs/${clubId}/join`,
    { method: 'POST' }
  )

export const leaveClub = (clubId: number) =>
  apiClient<{ left: boolean }>(`/clubs/${clubId}/leave`, { method: 'POST' })

export const listClubMembers = (clubId: number) =>
  apiClient<ClubMembersResponse>(`/clubs/${clubId}/members`)

// ────────────────────────────────────────────────────────────────────────────
// Join requests
// ────────────────────────────────────────────────────────────────────────────

export const listClubJoinRequests = (clubId: number) =>
  apiClient<ClubJoinRequestsResponse>(`/clubs/${clubId}/requests`)

export const decideJoinRequest = (
  clubId: number,
  requestId: number,
  approve: boolean,
  reason?: string
) =>
  apiClient<{ request: unknown }>(`/clubs/${clubId}/requests/${requestId}/decide`, {
    method: 'POST',
    body: JSON.stringify({ approve, reason })
  })

// ────────────────────────────────────────────────────────────────────────────
// Club management
// ────────────────────────────────────────────────────────────────────────────

export const editClub = (clubId: number, body: EditClubPayload) =>
  apiClient<{ club: ClubCreateResponse['club'] }>(`/clubs/${clubId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })

export const promoteMember = (clubId: number, userId: number) =>
  apiClient<{ promoted: boolean }>(`/clubs/${clubId}/members/${userId}/promote`, {
    method: 'POST'
  })

export const demoteMember = (clubId: number, userId: number) =>
  apiClient<{ demoted: boolean }>(`/clubs/${clubId}/members/${userId}/demote`, {
    method: 'POST'
  })

export const kickMember = (clubId: number, userId: number) =>
  apiClient<{ removed: boolean }>(`/clubs/${clubId}/members/${userId}`, {
    method: 'DELETE'
  })

// ────────────────────────────────────────────────────────────────────────────
// Interest tags
// ────────────────────────────────────────────────────────────────────────────

export const listInterestTags = () =>
  apiClient<InterestTagsResponse>('/clubs/interest-tags')

export const getMyInterests = () =>
  apiClient<UserInterestsResponse>('/clubs/my-interests')

export const updateMyInterests = (tagSlugs: string[]) =>
  apiClient<UserInterestsResponse>('/clubs/my-interests', {
    method: 'PUT',
    body: JSON.stringify({ tagSlugs })
  })

// ────────────────────────────────────────────────────────────────────────────
// Invites
// ────────────────────────────────────────────────────────────────────────────

export const createInvite = (
  clubId: number,
  body?: { inviteeUserId?: number; expiresInHours?: number }
) =>
  apiClient<{ invite: import('./types').ClubInvite }>(
    `/clubs/${clubId}/invites`,
    { method: 'POST', body: JSON.stringify(body ?? {}) }
  )

export const listInvites = (clubId: number) =>
  apiClient<ClubInvitesResponse>(`/clubs/${clubId}/invites`)

export const revokeInvite = (clubId: number, inviteId: number) =>
  apiClient<{ revoked: boolean }>(`/clubs/${clubId}/invites/${inviteId}`, {
    method: 'DELETE',
  })

export const acceptInvite = (token: string) =>
  apiClient<AcceptInviteResponse>('/clubs/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })

export const getInvitePreview = (token: string) =>
  apiClient<ClubInvitePreview>(`/clubs/invites/${encodeURIComponent(token)}/preview`)
