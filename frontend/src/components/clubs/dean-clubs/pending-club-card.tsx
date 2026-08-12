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
  const themeColor = club.themeColor || '#6366f1'

  return (
    <div className='overflow-hidden rounded-xl border'>
      <div
        className='h-16'
        style={{
          background: club.bannerUrl
            ? `url(${club.bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${themeColor}40, ${themeColor}15)`,
        }}
      />
      <div className='space-y-3 p-4'>
        <div className='flex items-start justify-between'>
          <div>
            <h3 className='font-semibold'>{club.name}</h3>
            {club.tagline && <p className='text-xs text-muted-foreground'>{club.tagline}</p>}
          </div>
          <div className='flex gap-1.5'>
            <Badge variant='outline' className='text-[10px]'>
              {club.joinPolicy?.toLowerCase().replace('_', ' ')}
            </Badge>
            <Badge variant='outline' className='text-[10px]'>
              {club.scopeKind?.toLowerCase()}
            </Badge>
          </div>
        </div>

        {club.description ? (
          <p className='text-sm text-muted-foreground'>{club.description}</p>
        ) : null}

        {club.rules ? (
          <div className='rounded border bg-muted/30 p-2.5'>
            <p className='mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
              Rules
            </p>
            <p className='line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground'>
              {club.rules}
            </p>
          </div>
        ) : null}

        {club.owner ? (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Icons.user className='h-3 w-3' />
            Applied by <strong>{club.owner.full_name}</strong>
            {club.owner.email ? <span>({club.owner.email})</span> : null}
          </div>
        ) : null}

        {club.faculty ? (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Icons.teams className='h-3 w-3' />
            Faculty: <strong>{club.faculty.name}</strong>
          </div>
        ) : null}

        {club.interests && club.interests.length > 0 ? (
          <div className='flex flex-wrap gap-1'>
            {club.interests.map((tag) => (
              <Badge key={tag.slug} variant='secondary' className='text-[10px]'>
                {tag.label}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className='flex items-center justify-end gap-2 pt-1'>
          <Button
            variant='outline'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={onReject}
          >
            Reject
          </Button>
          <Button
            size='sm'
            onClick={onApprove}
            disabled={isApproving}
            style={{ backgroundColor: themeColor }}
          >
            {isApproving ? (
              <>
                <Icons.spinner className='mr-1.5 h-3 w-3 animate-spin' />
                Approving...
              </>
            ) : (
              <>
                <Icons.check className='mr-1.5 h-3 w-3' />
                Approve
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
