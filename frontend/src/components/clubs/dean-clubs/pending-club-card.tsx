'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import type { Club } from '@/lib/clubs/types'

export function PendingClubCard({
  club,
  onApprove,
  onReject,
  isApproving,
}: {
  club: Club
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
}) {
  return (
    <article className='rounded-lg border border-border bg-muted/50 p-2.5 shadow-sm'>
      <div className='mb-2 flex items-start gap-2'>
        <span className='mt-1 size-2 shrink-0 rounded-full bg-primary' aria-hidden />
        <div className='min-w-0 flex-1'>
          <h3 className='text-xs font-semibold text-foreground'>{club.name}</h3>
          {club.tagline ? (
            <p className='text-[11px] text-muted-foreground'>{club.tagline}</p>
          ) : null}
        </div>
      </div>

      {club.description ? (
        <p className='mb-2 line-clamp-2 text-[11px] text-foreground/80'>{club.description}</p>
      ) : null}

      {club.owner ? (
        <p className='text-[10px] text-foreground/75'>
          Applied by <span className='font-medium'>{club.owner.full_name}</span>
          {club.owner.email ? (
            <span className='text-muted-foreground'> ({club.owner.email})</span>
          ) : null}
        </p>
      ) : null}

      {club.faculty ? (
        <p className='text-[10px] text-muted-foreground'>
          Faculty: <span className='font-medium text-foreground/75'>{club.faculty.name}</span>
        </p>
      ) : null}

      {club.interests && club.interests.length > 0 ? (
        <div className='mt-1.5 flex flex-wrap gap-1'>
          {club.interests.map((tag) => (
            <Badge key={tag.slug} variant='secondary' className='text-[9px] px-1.5 py-0'>
              {tag.label}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className='mt-2 flex items-center justify-end gap-1.5 border-t border-border/60 pt-2'>
        <Button
          variant='outline'
          size='sm'
          className='h-7 px-2.5 text-[11px] text-destructive hover:text-destructive'
          onClick={onReject}
        >
          Reject
        </Button>
        <Button
          size='sm'
          className='h-7 px-2.5 text-[11px]'
          onClick={onApprove}
          disabled={isApproving}
        >
          {isApproving ? (
            <>
              <Icons.spinner className='me-1 h-3 w-3 animate-spin' />
              Approving…
            </>
          ) : (
            <>
              <Icons.check className='me-1 h-3 w-3' />
              Approve
            </>
          )}
        </Button>
      </div>
    </article>
  )
}
