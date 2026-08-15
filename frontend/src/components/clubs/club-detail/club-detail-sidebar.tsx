import { Icons } from '@/components/icons'
import type { Club } from '@/lib/clubs/types'
import { formatJoinPolicy } from './helpers'

type Props = {
  club: Club
  slug: string
  themeColor: string
  isMember: boolean
  isOwner: boolean
  membershipRole: string | null
}

export function ClubDetailSidebar({ club, themeColor }: Props) {
  return (
    <aside className='hidden w-80 shrink-0 space-y-4 lg:block'>
      {club.rules ? (
        <div className='overflow-hidden rounded-xl border' style={{ borderColor: `${themeColor}30` }}>
          <div
            className='px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white'
            style={{ backgroundColor: themeColor }}
          >
            Club Rules
          </div>
          <div className='divide-y p-0'>
            {club.rules
              .split('\n')
              .filter(Boolean)
              .map((rule, i) => (
                <div key={i} className='flex gap-3 px-4 py-3'>
                  <span
                    className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold'
                    style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                  >
                    {i + 1}
                  </span>
                  <p className='text-sm leading-relaxed text-muted-foreground'>{rule.trim()}</p>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      <div className='rounded-xl border bg-card'>
        <div className='border-b px-4 py-3 text-sm font-semibold'>About</div>
        <div className='space-y-3 p-4'>
          <p className='text-sm text-muted-foreground'>
            {club.description || 'No description yet.'}
          </p>
          {club.faculty ? (
            <div className='flex items-center justify-between'>
              <span className='text-xs text-muted-foreground'>Faculty</span>
              <span className='text-sm font-medium'>{club.faculty.name}</span>
            </div>
          ) : null}
          {club.owner ? (
            <div className='flex items-center justify-between'>
              <span className='text-xs text-muted-foreground'>Created by</span>
              <div className='flex items-center gap-1.5'>
                <Icons.pro className='h-3 w-3 text-amber-500' />
                <span className='text-sm font-medium'>{club.owner.full_name}</span>
              </div>
            </div>
          ) : null}
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>Members</span>
            <span className='text-sm font-medium'>{club.memberCountCache}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>Privacy</span>
            <span className='text-sm font-medium capitalize'>
              {formatJoinPolicy(club.joinPolicy)}
            </span>
          </div>
          {club.status === 'PENDING' ? (
            <div className='flex items-center gap-1.5 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'>
              <Icons.alertCircle className='h-3.5 w-3.5' />
              Pending approval
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
