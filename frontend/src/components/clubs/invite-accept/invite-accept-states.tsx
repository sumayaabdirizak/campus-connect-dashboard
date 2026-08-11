'use client'

export interface InviteAcceptErrorProps {
  error?: Error | null;
}

export function InviteAcceptLoading() {
  return <div className="p-4">Loading invite...</div>
}

export function InviteAcceptError({ error }: InviteAcceptErrorProps) {
  return (
    <div className="p-4">
      <p>Error loading invite</p>
      {error && <p className="text-sm text-gray-600">{error.message}</p>}
    </div>
  )
}

export default InviteAcceptLoading
