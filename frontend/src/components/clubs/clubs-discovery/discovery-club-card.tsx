'use client'

export interface DiscoveryClubCardProps {
  club: unknown;
  isMember: boolean;
}

export function DiscoveryClubCard({ club, isMember }: DiscoveryClubCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="font-semibold">Club Card</div>
      <p className="text-sm text-gray-600">{isMember ? 'Member' : 'Not a member'}</p>
    </div>
  )
}

export default DiscoveryClubCard
