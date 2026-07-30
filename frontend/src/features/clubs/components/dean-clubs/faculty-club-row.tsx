'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { messagesClubHref } from '@/features/inbox/lib/messages-href'
import type { Club } from '../../api/types'
import { formatClubDisplayName } from '../club-detail/helpers'
import { ClubStatusBadge } from './club-status-badge'

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

export function FacultyClubRow({
  club,
  onSuspend,
  onRestore,
  isSuspending,
  isRestoring,
}: {
  club: Club
  onSuspend: () => void
  onRestore: () => void
  isSuspending: boolean
  isRestoring: boolean
}) {
  const themeColor = club.themeColor || '#3B82F6'
  const name = formatClubDisplayName(club.name)
  const href = messagesClubHref(club.slug)

  return (
    <div className='flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3.5'>
      <div
        className='flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold'
        style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
      >
        {club.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={club.iconUrl} alt='' className='size-10 object-cover' />
        ) : (
          initials(club.name)
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <Link
            href={href}
            className='truncate text-sm font-semibold text-[#101828] hover:underline'
          >
            {name}
          </Link>
          <ClubStatusBadge status={club.status ?? 'APPROVED'} />
        </div>
        <p className='mt-0.5 truncate text-[11px] text-[#98A2B3]'>
          {club.memberCountCache ?? 0} members
          {club.owner ? ` · ${club.owner.full_name}` : ''}
          {club.faculty?.name ? ` · ${club.faculty.name}` : ''}
        </p>
      </div>

      <div className='flex shrink-0 items-center gap-1.5'>
        {club.status !== 'REJECTED' ? (
          <Link href={href}>
            <Button size='sm' variant='outline' className='h-8 border-[#E5E7EB] text-xs'>
              <Icons.externalLink className='mr-1 size-3' />
              Open
            </Button>
          </Link>
        ) : null}
        {club.status === 'APPROVED' ? (
          <Button
            size='sm'
            variant='outline'
            className='h-8 border-[#FDBA74] text-xs text-[#C4320A] hover:bg-[#FFF4ED]'
            onClick={onSuspend}
            disabled={isSuspending}
          >
            {isSuspending ? '…' : 'Suspend'}
          </Button>
        ) : null}
        {club.status === 'SUSPENDED' ? (
          <Button
            size='sm'
            variant='outline'
            className='h-8 border-[#6EE7B7] text-xs text-[#027A48] hover:bg-[#ECFDF3]'
            onClick={onRestore}
            disabled={isRestoring}
          >
            {isRestoring ? '…' : 'Restore'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
