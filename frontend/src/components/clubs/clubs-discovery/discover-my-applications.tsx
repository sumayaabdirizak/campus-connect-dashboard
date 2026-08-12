'use client'

import { Icons } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import type { Club } from '@/lib/clubs/types'

export interface DiscoverMyApplicationsProps {
  clubs: Club[];
}

/** Shows the current user's own club applications that are still pending or were rejected. */
export function DiscoverMyApplications({ clubs }: DiscoverMyApplicationsProps) {
  if (clubs.length === 0) return null

  return (
    <div className='space-y-2 rounded-xl border border-[#E5E7EB] bg-white p-3'>
      <h3 className='flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#667085] uppercase'>
        <Icons.clock className='size-3.5' />
        My applications
      </h3>
      <div className='space-y-1.5'>
        {clubs.map((club) => (
          <div key={club.id} className='flex items-center justify-between gap-2 rounded-lg px-2 py-1.5'>
            <span className='truncate text-sm text-[#101828]'>{club.name}</span>
            <Badge
              variant={club.status === 'REJECTED' ? 'destructive' : 'secondary'}
              className='shrink-0 text-[10px] capitalize'
            >
              {club.status.toLowerCase()}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DiscoverMyApplications
