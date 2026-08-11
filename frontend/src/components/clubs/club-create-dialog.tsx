'use client'

export interface ClubCreateDialogProps {
  isDean: boolean;
  isSuperAdmin: boolean;
}

export function ClubCreateDialog({ isDean, isSuperAdmin }: ClubCreateDialogProps) {
  return (
    <div className="p-4">
      {isDean || isSuperAdmin ? (
        <button className="text-blue-600">Create Club</button>
      ) : null}
    </div>
  )
}

export default ClubCreateDialog
