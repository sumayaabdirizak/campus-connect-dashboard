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
  /** Set once a BY_REQUEST join returns PENDING — the viewer isn't a member yet. */
  requested?: boolean
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
  requested = false,
  onJoin,
  onLeave,
  isCollapsed = false,
}: Props) {
  return (
    <div className={`relative z-20 w-full bg-card border-b border-border sticky top-0 transition-shadow duration-200 ${isCollapsed ? 'py-2.5' : 'pb-4'}`}>
      <div className='mx-auto max-w-5xl px-4'>
        {isCollapsed ? (
          <div className='flex items-center justify-between gap-4 animate-fade-in'>
            <div className='flex items-center gap-3 min-w-0'>
              <Link
                href={messagesDiscoverHref()}
                className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted'
              >
                <Icons.chevronLeft className='h-4 w-4 text-muted-foreground' />
              </Link>
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card p-0.5'>
                {club.iconUrl ? (
                  <img src={club.iconUrl} alt='' className='h-full w-full rounded-full object-cover' />
                ) : (
                  <div
                    className='flex h-full w-full items-center justify-center rounded-full font-bold text-white text-[10px]'
                    style={{ backgroundColor: themeColor }}
                  >
                    {initials}
                  </div>
                )}
              </div>
              <h1 className='text-lg font-bold text-foreground truncate'>{club.name}</h1>
              {club.isOfficial ? <Icons.circleCheck className='h-4 w-4 text-blue-500 shrink-0' /> : null}
            </div>

            <div className='flex items-center gap-2'>
              {!isMember && !isOwner && !isPending && !requested && club.joinPolicy !== 'INVITE_ONLY' ? (
                <Button
                  size='sm'
                  onClick={onJoin}
                  disabled={joining}
                  className='bg-[#ef4444] hover:bg-[#dc2626] text-white border-0 rounded-lg px-4 py-2 text-xs font-semibold'
                >
                  {joining
                    ? 'Joining...'
                    : club.joinPolicy === 'OPEN'
                      ? 'Join group'
                      : 'Request to Join'}
                </Button>
              ) : null}
              {!isMember && !isOwner && requested ? (
                <span className='flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2 text-xs font-semibold text-muted-foreground'>
                  <Icons.clock className='h-3 w-3' />
                  Pending
                </span>
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
            <div className='flex items-end gap-3'>
              {/* Half on banner (h-12 → -mt-6), half on white header */}
              <div className='relative z-30 -mt-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-card p-0.5 shadow-md'>
                {club.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={club.iconUrl}
                    alt=''
                    className='h-full w-full rounded-full object-cover'
                  />
                ) : (
                  <div
                    className='flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-white'
                    style={{ backgroundColor: themeColor }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              <div className='pb-0.5'>
                <div className='flex items-center gap-2'>
                  <h1 className='text-xl font-bold text-foreground'>{club.name}</h1>
                  {roleLabel ? <ClubRoleBadge role={roleLabel} themeColor={themeColor} /> : null}
                </div>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {club.memberCountCache || 0} {club.memberCountCache === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2 pt-2 sm:pt-0'>
              {!isMember && !isOwner && !isPending && !requested && club.joinPolicy !== 'INVITE_ONLY' ? (
                <Button
                  size='sm'
                  onClick={onJoin}
                  disabled={joining}
                  className='bg-[#ef4444] hover:bg-[#dc2626] text-white border-0 rounded-lg px-5 py-2.5 text-sm font-semibold'
                >
                  {joining
                    ? 'Joining...'
                    : club.joinPolicy === 'OPEN'
                      ? 'Join group'
                      : 'Request to Join'}
                </Button>
              ) : null}
              {!isMember && !isOwner && requested ? (
                <span className='flex items-center gap-1.5 rounded-lg border border-dashed border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground'>
                  <Icons.clock className='h-3.5 w-3.5' />
                  Pending
                </span>
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
