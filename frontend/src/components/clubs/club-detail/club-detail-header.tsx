import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { ClubRoleBadge } from '@/components/clubs/club-role-badge'
import type { Club, ClubRole } from '@/lib/clubs/types'
import { messagesClubManageHref, messagesServerHref } from '@/lib/inbox/services/messages-href'

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
}: Props) {
  return (
    <div className='mx-auto max-w-5xl px-4'>
      <div className='-mt-8 flex items-end gap-4'>
        <div
          className='flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-background text-2xl font-bold shadow-lg'
          style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
        >
          {club.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.iconUrl} alt='' className='h-full w-full rounded-full object-cover' />
          ) : (
            initials
          )}
        </div>

        <div className='flex-1 pb-1'>
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl font-bold tracking-tight'>{club.name}</h1>
            {club.isOfficial ? <Icons.circleCheck className='h-5 w-5 text-blue-500' /> : null}
            {roleLabel ? <ClubRoleBadge role={roleLabel} themeColor={themeColor} /> : null}
          </div>
          {club.tagline ? (
            <p className='text-sm text-muted-foreground'>{club.tagline}</p>
          ) : null}
        </div>

        <div className='flex items-center gap-2 pb-1'>
          {(isMember || isOwner) && club.serverId ? (
            <Link href={messagesServerHref(String(club.serverId))}>
              <Button size='sm' className='gap-1.5 shadow-sm' style={{ backgroundColor: themeColor }}>
                <Icons.chat className='h-3.5 w-3.5' />
                Open Chat
              </Button>
            </Link>
          ) : null}
          {!isMember && !isOwner && !isPending && club.joinPolicy !== 'INVITE_ONLY' ? (
            <Button
              size='sm'
              onClick={onJoin}
              disabled={joining}
              style={{ backgroundColor: themeColor }}
              className='shadow-sm'
            >
              {joining
                ? 'Joining...'
                : club.joinPolicy === 'OPEN'
                  ? 'Join'
                  : 'Request to Join'}
            </Button>
          ) : null}
          {isMember && !isOwner ? (
            <Button size='sm' variant='outline' onClick={onLeave} disabled={leaving}>
              {leaving ? 'Leaving...' : 'Leave'}
            </Button>
          ) : null}
          {isOwner || membershipRole === 'ADMIN' ? (
            <Link href={messagesClubManageHref(slug)}>
              <Button size='sm' variant='outline' className='gap-1.5'>
                <Icons.settings className='h-3.5 w-3.5' />
                Manage
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
