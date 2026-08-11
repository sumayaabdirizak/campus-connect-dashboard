'use client'

export interface InviteAcceptSuccessProps {
  club: unknown;
  acceptResult: unknown;
}

export function InviteAcceptSuccess({ club, acceptResult }: InviteAcceptSuccessProps) {
  return (
    <div className="p-4">
      <h2>Invitation Accepted!</h2>
      <p>You have successfully joined the club.</p>
    </div>
  )
}

export default InviteAcceptSuccess
