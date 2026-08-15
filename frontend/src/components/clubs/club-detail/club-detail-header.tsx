import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { ClubRoleBadge } from '@/components/clubs/club-role-badge'
import type { Club, ClubRole } from '@/lib/clubs/types'
import { messagesClubManageHref, messagesDiscoverHref } from '@/lib/inbox/services/messages-href'

type Props = {
  club: Club
  slug: string
  themeColor: string
  initials: string
  roleLabel: ClubRole | null
  isMember: boolean
  isOwner: boolean
  isPending: boolean
  membershipRole: string | null
  joining: boolean
  leaving: boolean
  onJoin: () => void
  onLeave: () => void
  isCollapsed?: boolean
}

export function ClubDetailHeader({
  club,
  slug,
  themeColor,
  initials,
  roleLabel,
  isMember,
  isOwner,
  isPending,
  membershipRole,
  joining,
  leaving,
  onJoin,
  onLeave,
  isCollapsed = false,
}: Props) {
  return (
    <div className={`w-full bg-white border-b border-gray-200 sticky top-0 z-30 transition-shadow duration-200 ${isCollapsed ? 'py-2.5 shadow-sm' : 'pb-4'}`}>
      <div className='mx-auto max-w-5xl px-4'>
        {isCollapsed ? (
          <div className='flex items-center justify-between gap-4 animate-fade-in'>
            <div className='flex items-center gap-3 min-w-0'>
              <Link
                href={messagesDiscoverHref()}
                className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-colors hover:bg-gray-50'
              >
                <Icons.chevronLeft className='h-4 w-4 text-gray-700' />
              </Link>
              <div className='hidden sm:flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 bg-white shadow-sm text-xs font-semibold shrink-0'>
                <Link
                  href={messagesDiscoverHref()}
                  className='text-gray-400 hover:text-gray-600 transition-colors'
                >
                  Clubs
                </Link>
                <span className='text-gray-300'>/</span>
                <span className='text-gray-800 truncate max-w-[120px]'>{club.name}</span>
              </div>
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm'>
                {club.iconUrl ? (
                  <img src={club.iconUrl} alt='' className='h-full w-full rounded-lg object-cover' />
                ) : (
                  <div
                    className='flex h-full w-full items-center justify-center rounded-lg font-bold text-white text-xs'
                    style={{ backgroundColor: themeColor }}
                  >
                    {initials}
                  </div>
                )}
              </div>
              <h1 className='text-lg font-bold text-gray-900 truncate'>{club.name}</h1>
              {club.isOfficial ? <Icons.circleCheck className='h-4 w-4 text-blue-500 shrink-0' /> : null}
            </div>

            <div className='flex items-center gap-2'>
              {!isMember && !isOwner && !isPending && club.joinPolicy !== 'INVITE_ONLY' ? (
                <Button
                  size='sm'
                  onClick={onJoin}
                  disabled={joining}
                  className='bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-sm border-0 rounded-lg px-4 py-2 text-xs font-semibold'
                >
                  {joining
                    ? 'Joining...'
                    : club.joinPolicy === 'OPEN'
                      ? 'Join group'
                      : 'Request to Join'}
                </Button>
              ) : null}
              {isMember && !isOwner ? (
                <Button size='sm' variant='outline' onClick={onLeave} disabled={leaving} className='rounded-lg px-3 py-1.5 text-xs'>
                  {leaving ? 'Leaving...' : 'Leave'}
                </Button>
              ) : null}
              {isOwner || membershipRole === 'ADMIN' ? (
                <Link href={messagesClubManageHref(slug)}>
                  <Button size='sm' variant='outline' className='gap-1.5 rounded-lg px-3 py-1.5 text-xs'>
                    <Icons.settings className='h-3 w-3' />
                    Manage
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 shadow-sm'>
                {club.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={club.iconUrl} alt='' className='h-full w-full rounded-md object-cover' />
                ) : (
                  <div
                    className='flex h-full w-full items-center justify-center rounded-md font-bold text-white text-sm'
                    style={{ backgroundColor: themeColor }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              <div>
                <div className='flex items-center gap-2'>
                  <h1 className='text-xl font-bold text-gray-900'>{club.name}</h1>
                  {roleLabel ? <ClubRoleBadge role={roleLabel} themeColor={themeColor} /> : null}
                </div>
                <p className='text-xs text-gray-500 mt-0.5'>
                  {club.memberCountCache || 0} {club.memberCountCache === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2 pt-2 sm:pt-0'>
              {!isMember && !isOwner && !isPending && club.joinPolicy !== 'INVITE_ONLY' ? (
                <Button
                  size='sm'
                  onClick={onJoin}
                  disabled={joining}
                  className='bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-sm border-0 rounded-lg px-5 py-2.5 text-sm font-semibold'
                >
                  {joining
                    ? 'Joining...'
                    : club.joinPolicy === 'OPEN'
                      ? 'Join group'
                      : 'Request to Join'}
                </Button>
              ) : null}
              {isMember && !isOwner ? (
                <Button size='sm' variant='outline' onClick={onLeave} disabled={leaving} className='rounded-lg px-4 py-2'>
                  {leaving ? 'Leaving...' : 'Leave'}
                </Button>
              ) : null}
              {isOwner || membershipRole === 'ADMIN' ? (
                <Link href={messagesClubManageHref(slug)}>
                  <Button size='sm' variant='outline' className='gap-1.5 rounded-lg px-4 py-2'>
                    <Icons.settings className='h-3.5 w-3.5' />
                    Manage
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
