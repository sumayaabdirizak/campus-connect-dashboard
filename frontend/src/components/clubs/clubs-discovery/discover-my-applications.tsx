'use client'

export interface DiscoverMyApplicationsProps {
  clubs: unknown[];
}

export function DiscoverMyApplications({ clubs }: DiscoverMyApplicationsProps) {
  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">My Applications</h3>
      <p className="text-sm text-gray-600">{clubs.length} pending applications</p>
    </div>
  )
}

export default DiscoverMyApplications
