'use client'

export interface InviteAcceptCardProps {
  data: unknown;
  isPending: boolean;
  onAccept: () => void;
}

export function InviteAcceptCard({ data, isPending, onAccept }: InviteAcceptCardProps) {
  return (
    <div className="p-4">
      <h2>Club Invitation</h2>
      <p>You have been invited to join a club</p>
      <button onClick={onAccept} disabled={isPending}>
        {isPending ? 'Accepting...' : 'Accept Invitation'}
      </button>
    </div>
  )
}

export default InviteAcceptCard
