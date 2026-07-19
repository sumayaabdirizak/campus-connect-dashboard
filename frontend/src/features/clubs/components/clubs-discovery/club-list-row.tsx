import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import type { Club } from '@/features/clubs/api/types'

type Props = {
  club: Club
  index: number
  isMember: boolean
  onJoin: () => void
  isJoining: boolean
}

export function ClubListRow({ club, index, isMember, onJoin, isJoining }: Props) {
  const themeColor = club.themeColor || '#6366f1'
  const initials = club.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')

  return (
    <div className='group flex items-center gap-4 border-b px-4 py-3 transition-colors hover:bg-muted/50 last:border-b-0'>
      <span className='w-6 shrink-0 text-center text-sm font-medium text-muted-foreground'>
        {index + 1}
      </span>
      <div className='flex shrink-0 flex-col items-center gap-0.5'>
        <Icons.chevronUp className='h-4 w-4 text-muted-foreground/50' />
        <span className='text-xs font-bold text-foreground'>{club.memberCountCache}</span>
      </div>
      <Link href={`/dashboard/clubs/${club.slug}`} className='shrink-0'>
        <div
          className='flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-transform group-hover:scale-105'
          style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
        >
          {club.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.iconUrl} alt='' className='h-full w-full rounded-full object-cover' />
          ) : (
            initials
          )}
        </div>
      </Link>
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='flex items-center gap-2'>
          <Link
            href={`/dashboard/clubs/${club.slug}`}
            className='truncate text-sm font-semibold transition-colors hover:underline'
          >
            {club.name}
          </Link>
          {club.isOfficial ? <Icons.circleCheck className='h-3.5 w-3.5 shrink-0 text-blue-500' /> : null}
          <Badge variant='outline' className='h-5 shrink-0 px-1.5 text-[10px] capitalize'>
            {club.joinPolicy.toLowerCase().replace('_', ' ')}
          </Badge>
          {club.status === 'PENDING' ? (
            <Badge
              variant='secondary'
              className='h-5 shrink-0 bg-yellow-100 px-1.5 text-[10px] text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'
            >
              Pending
            </Badge>
          ) : null}
        </div>
        <p className='truncate text-xs text-muted-foreground'>
          {club.tagline || club.description || 'No description'}
        </p>
        <div className='mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <Icons.teams className='h-3 w-3' />
            {club.memberCountCache} member{club.memberCountCache !== 1 ? 's' : ''}
          </span>
          {club.faculty ? (
            <span className='flex items-center gap-1'>
              <Icons.hash className='h-3 w-3' />
              {club.faculty.name}
            </span>
          ) : null}
          {club.interests && club.interests.length > 0 ? (
            <span className='hidden items-center gap-1 sm:flex'>
              <Icons.hash className='h-3 w-3' />
              {club.interests
                .slice(0, 2)
                .map((t) => t.label)
                .join(', ')}
              {club.interests.length > 2 ? ` +${club.interests.length - 2}` : ''}
            </span>
          ) : null}
        </div>
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        {isMember ? (
          <Link
            href={
              club.serverId ? `/dashboard/chat/${club.serverId}` : `/dashboard/clubs/${club.slug}`
            }
          >
            <Button size='sm' variant='outline' className='h-8 gap-1.5 text-xs'>
              <Icons.chat className='h-3 w-3' />
              Joined
            </Button>
          </Link>
        ) : club.joinPolicy !== 'INVITE_ONLY' && club.status === 'APPROVED' ? (
          <Button
            size='sm'
            className='h-8 text-xs text-white shadow-sm'
            style={{ backgroundColor: themeColor }}
            onClick={(e) => {
              e.preventDefault()
              onJoin()
            }}
            disabled={isJoining}
          >
            {isJoining ? 'Joining...' : club.joinPolicy === 'OPEN' ? 'Join' : 'Request'}
          </Button>
        ) : (
          <Link href={`/dashboard/clubs/${club.slug}`}>
            <Button size='sm' variant='ghost' className='h-8 text-xs'>
              View
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
