'use client'

import { Button } from '@/components/ui/button'
import type { Club } from '@/lib/clubs/types'
import { ClubStatusBadge } from './club-status-badge'

export function FacultyClubRow({
  club,
  onSuspend,
  isSuspending,
}: {
  club: Club
  onSuspend: () => void
  isSuspending: boolean
}) {
  return (
    <article className='rounded-lg border border-border bg-muted/50 p-2.5 shadow-sm'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='size-2 shrink-0 rounded-full bg-primary' aria-hidden />
            <h3 className='truncate text-xs font-semibold text-foreground'>{club.name}</h3>
            <ClubStatusBadge status={club.status ?? 'APPROVED'} />
          </div>
          {club.tagline ? (
            <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>{club.tagline}</p>
          ) : null}
          {club.owner ? (
            <p className='mt-0.5 text-[10px] text-foreground/75'>
              Owner: <span className='font-medium'>{club.owner.full_name}</span>
            </p>
          ) : null}
          <p className='text-[10px] text-muted-foreground'>{club.memberCountCache} members</p>
        </div>
        {club.status === 'APPROVED' ? (
          <Button
            variant='outline'
            size='sm'
            className='h-7 shrink-0 px-2.5 text-[11px] text-primary hover:bg-primary/10 hover:text-primary'
            onClick={onSuspend}
            disabled={isSuspending}
          >
            {isSuspending ? '…' : 'Suspend'}
          </Button>
        ) : null}
      </div>
    </article>
  )
}
