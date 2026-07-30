import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { ClubRoleBadge } from '@/features/clubs/components/club-role-badge'
import type { Club, ClubRole } from '@/features/clubs/api/types'
import { ClubAvatarUpload } from './club-avatar-upload'
import { messagesClubManageHref } from '@/features/inbox/lib/messages-href'
import { formatClubDisplayName } from './helpers'

type Props = {
  club: Club
  themeColor: string
  initials: string
  roleLabel: ClubRole | null
  isMember: boolean
  isOwner: boolean
  isPending: boolean
  joinRequestPending?: boolean
  membershipRole: string | null
  joining: boolean
  leaving: boolean
  onJoin: () => void
  onLeave: () => void
  hideJoinActions?: boolean
}

export function ClubDetailHeader({
  club,
  themeColor,
  initials,
  roleLabel,
  isMember,
  isOwner,
  isPending,
  joinRequestPending = false,
  membershipRole,
  joining,
  leaving,
  onJoin,
  onLeave,
  hideJoinActions = false,
}: Props) {
  const displayName = formatClubDisplayName(club.name)
  const canEditAvatar = isOwner || membershipRole === 'ADMIN'

  return (
    <div className='relative z-10 border-b border-[#E5E7EB] bg-white'>
      <div className='mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-4 pt-0 sm:flex-row sm:items-end sm:justify-between sm:px-6'>
        <div className='-mt-12 flex min-w-0 items-end gap-4 sm:-mt-14'>
          <ClubAvatarUpload
            clubId={club.id}
            iconUrl={club.iconUrl}
            initials={initials}
            themeColor={themeColor}
            canEdit={canEditAvatar}
          />
          <div className='min-w-0 pb-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='truncate text-2xl font-bold tracking-tight text-[#101828] sm:text-3xl'>
                {displayName}
              </h1>
              {club.isOfficial ? <Icons.circleCheck className='h-5 w-5 text-[#3B82F6]' /> : null}
              {roleLabel ? <ClubRoleBadge role={roleLabel} themeColor={themeColor} /> : null}
            </div>
            {club.tagline ? (
              <p className='mt-0.5 text-sm text-[#667085]'>{club.tagline}</p>
            ) : (
              <p className='mt-0.5 text-sm text-[#98A2B3]'>
                {club.memberCountCache} member{club.memberCountCache === 1 ? '' : 's'}
                {club.faculty ? ` · ${club.faculty.name}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2 pb-1'>
          {!hideJoinActions && !isMember && !isOwner && !isPending && joinRequestPending ? (
            <Button size='sm' variant='outline' disabled className='text-[#667085]'>
              Pending
            </Button>
          ) : null}
          {!hideJoinActions &&
          !isMember &&
          !isOwner &&
          !isPending &&
          !joinRequestPending &&
          club.joinPolicy !== 'INVITE_ONLY' ? (
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
                  ? 'Join group'
                  : 'Request to join'}
            </Button>
          ) : null}
          {isMember && !isOwner ? (
            <Button size='sm' variant='outline' onClick={onLeave} disabled={leaving}>
              {leaving ? 'Leaving...' : 'Leave'}
            </Button>
          ) : null}
          {canEditAvatar ? (
            <Link href={messagesClubManageHref(club.slug)}>
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
