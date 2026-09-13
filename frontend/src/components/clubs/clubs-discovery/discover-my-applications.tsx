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
    <div className='space-y-1.5 rounded-lg border border-border bg-primary/10 p-2.5'>
      <h3 className='flex items-center gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-[#1D4ED8]'>
        <Icons.clock className='size-3.5' />
        My applications
      </h3>
      <div className='space-y-1'>
        {clubs.map((club) => (
          <div
            key={club.id}
            className='flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-2'
          >
            <span className='truncate text-sm font-medium text-foreground'>{club.name}</span>
            <Badge
              variant={club.status === 'REJECTED' ? 'destructive' : 'secondary'}
              className='shrink-0 text-[10px] font-semibold capitalize'
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
