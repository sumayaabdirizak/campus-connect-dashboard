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
    <div className='overflow-hidden rounded-xl border'>
      <div
        className='h-10'
        style={{
          background: club.bannerUrl
            ? `url(${club.bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${club.themeColor ?? '#6366f1'}40, ${club.themeColor ?? '#6366f1'}15)`,
        }}
      />
      <div className='flex items-start justify-between p-4'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <h3 className='font-semibold'>{club.name}</h3>
            <ClubStatusBadge status={club.status ?? 'APPROVED'} />
          </div>
          {club.tagline ? (
            <p className='text-xs text-muted-foreground'>{club.tagline}</p>
          ) : null}
          {club.owner ? (
            <p className='mt-1 text-xs text-muted-foreground'>
              Owner: <strong>{club.owner.full_name}</strong>
            </p>
          ) : null}
          <p className='text-xs text-muted-foreground'>
            {club.memberCountCache} members
          </p>
        </div>
        {club.status === 'APPROVED' ? (
          <Button
            variant='outline'
            size='sm'
            className='ml-3 shrink-0 text-orange-600 hover:text-orange-700'
            onClick={onSuspend}
            disabled={isSuspending}
          >
            {isSuspending ? 'Suspending...' : 'Suspend'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
