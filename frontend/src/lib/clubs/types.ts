/**
 * Central type definitions for the Clubs module.
 *
 * Mirrors the shapes returned by the backend at /api/clubs/* (see
 * backend/src/controllers/clubs/clubs.js).
 */

// ────────────────────────────────────────────────────────────────────────────
// Enums
// ────────────────────────────────────────────────────────────────────────────

export type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ARCHIVED'

export type ClubJoinPolicy = 'OPEN' | 'BY_REQUEST' | 'INVITE_ONLY'

export type ClubScopeKind = 'FACULTY' | 'UNIVERSITY' | 'CROSS'

export type ClubJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** The user-facing role label — derived from the stored membership role. */
export type ClubRole = 'OWNER' | 'MODERATOR' | 'MEMBER'

// ────────────────────────────────────────────────────────────────────────────
// Entities
// ────────────────────────────────────────────────────────────────────────────

export type InterestTag = {
  slug: string
  label: string
  category?: string
}

export type ClubFaculty = {
  id: number
  name: string
}

export type ClubOwner = {
  id: number
  full_name: string
  email?: string
}

export type Club = {
  id: number
  slug: string
  name: string
  tagline?: string | null
  description?: string | null
  rules?: string | null
  iconUrl?: string | null
  bannerUrl?: string | null
  themeColor?: string | null
  status: ClubStatus
  joinPolicy: ClubJoinPolicy
  scopeKind: ClubScopeKind
  facultyId?: number | null
  faculty?: ClubFaculty | null
  ownerId?: number | null
  owner?: ClubOwner | null
  serverId?: number | null
  isOfficial?: boolean
  memberCountCache: number
  lastActivityAt?: string | null
  createdAt: string
  interests: InterestTag[]
  pendingRequestCount?: number
}

export type ClubMember = {
  userId: number
  user: {
    id: number
    full_name: string
    email?: string
    avatarUrl?: string | null
  }
  role: string
  clubRole: ClubRole
  joinedAt: string
}

export type ClubJoinRequest = {
  id: number
  clubId: number
  userId: number
  status: ClubJoinRequestStatus
  requestedAt: string
  decidedAt?: string | null
  decidedByUserId?: number | null
  reason?: string | null
  user?: {
    id: number
    full_name: string
    email?: string
    avatarUrl?: string | null
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Request payloads
// ────────────────────────────────────────────────────────────────────────────

export type CreateClubPayload = {
  name: string
  slug?: string
  tagline?: string | null
  description?: string | null
  rules?: string | null
  iconUrl?: string | null
  bannerUrl?: string | null
  themeColor?: string | null
  joinPolicy?: ClubJoinPolicy
  scopeKind?: ClubScopeKind
  facultyId?: number | null
  interestTagSlugs?: string[]
  /** Path B only — dean assigns moderators at creation time */
  moderatorUserIds?: number[]
}

export type EditClubPayload = {
  name?: string
  tagline?: string | null
  description?: string | null
  rules?: string | null
  iconUrl?: string | null
  bannerUrl?: string | null
  themeColor?: string | null
  joinPolicy?: ClubJoinPolicy
}

// ────────────────────────────────────────────────────────────────────────────
// Response shapes
// ────────────────────────────────────────────────────────────────────────────

export type ClubListResponse = {
  clubs: Club[]
  nextCursor: number | null
  hasMore: boolean
}

export type ClubDetailResponse = {
  club: Club
  isMember: boolean
  isOwner: boolean
  membershipRole: string | null
}

export type ClubMineResponse = {
  owned: Club[]
  memberOf: Club[]
  moderating: Club[]
}

export type ClubMembersResponse = {
  members: ClubMember[]
}

export type ClubJoinRequestsResponse = {
  requests: ClubJoinRequest[]
}

export type ClubCreateResponse = {
  club: Club
  serverId?: number
  defaultChannelId?: number
}

export type InterestTagsResponse = {
  tags: (InterestTag & { category?: string })[]
}

// ────────────────────────────────────────────────────────────────────────────
// Invites
// ────────────────────────────────────────────────────────────────────────────

export type ClubInvite = {
  id: number
  clubId: number
  inviterUserId: number
  inviteeUserId?: number | null
  token: string
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED'
  createdAt: string
  expiresAt?: string | null
  usedAt?: string | null
  revokedAt?: string | null
  inviteUrl: string
  inviter?: { id: number; full_name: string }
  invitee?: { id: number; full_name: string; email?: string } | null
}

export type ClubInvitesResponse = {
  invites: ClubInvite[]
}

export type ClubInvitePreview = {
  club: {
    id: number
    slug: string
    name: string
    tagline?: string | null
    bannerUrl?: string | null
    iconUrl?: string | null
    themeColor?: string | null
    memberCountCache: number
    isOfficial?: boolean
    scopeKind?: ClubScopeKind
  }
  inviter?: { id: number; full_name: string }
  token: string
  expiresAt?: string | null
}

export type UserInterestsResponse = {
  tags: InterestTag[]
}

export type AcceptInviteResponse = {
  joined: boolean
  alreadyMember: boolean
  club: {
    id: number
    slug: string
    name: string
    serverId?: number | null
  }
}
