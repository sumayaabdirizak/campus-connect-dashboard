'use client'

export function extractClubInviteToken(token: string) {
  return token
}

interface ClubLinkCardProps {
  token: string;
}

export function ClubLinkCard({ token }: ClubLinkCardProps) {
  return <div className="p-4">Club Link Card - {token}</div>
}

export default ClubLinkCard
