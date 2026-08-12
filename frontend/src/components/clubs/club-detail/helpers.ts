import type { ClubRole } from '@/lib/clubs/types'

export function clubInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function resolveClubRoleLabel(
  isOwner: boolean,
  membershipRole: string | null,
  isMember: boolean
): ClubRole | null {
  if (isOwner) return 'OWNER'
  if (membershipRole === 'ADMIN') return 'MODERATOR'
  if (isMember) return 'MEMBER'
  return null
}

export function formatJoinPolicy(policy: string): string {
  return policy.toLowerCase().replace('_', ' ')
}
