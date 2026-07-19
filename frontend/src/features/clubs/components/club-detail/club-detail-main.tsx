import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import type { Club } from '@/features/clubs/api/types'
import { formatJoinPolicy } from './helpers'

type Props = {
  club: Club
  themeColor: string
  isMember: boolean
  isOwner: boolean
  joining: boolean
  onJoin: () => void
}

export function ClubDetailMain({
  club,
  themeColor,
  isMember,
  isOwner,
  joining,
  onJoin,
}: Props) {
  return (
    <div className='min-w-0 flex-1 space-y-4'>
      {club.interests && club.interests.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {club.interests.map((tag) => (
            <span
              key={tag.slug}
              className='inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium'
              style={{ backgroundColor: `${themeColor}12`, color: themeColor }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      ) : null}

      {club.description ? (
        <div className='rounded-xl border bg-card p-5'>
          <h3 className='mb-2 text-sm font-semibold'>About this community</h3>
          <p className='text-sm leading-relaxed text-muted-foreground'>{club.description}</p>
        </div>
      ) : null}

      {(isMember || isOwner) && club.serverId ? (
        <div className='rounded-xl border bg-card p-6'>
          <div className='flex flex-col items-center gap-3 py-8 text-center'>
            <div
              className='flex h-12 w-12 items-center justify-center rounded-full'
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Icons.chat className='h-6 w-6' style={{ color: themeColor }} />
            </div>
            <div>
              <p className='font-medium'>Start chatting</p>
              <p className='text-sm text-muted-foreground'>
                Head to the club chat to connect with members
              </p>
            </div>
            <Link href={`/dashboard/chat/${club.serverId}`}>
              <Button size='sm' className='mt-1 gap-1.5' style={{ backgroundColor: themeColor }}>
                <Icons.chat className='h-3.5 w-3.5' />
                Open Chat
              </Button>
            </Link>
          </div>
        </div>
      ) : !isMember && !isOwner ? (
        <div className='rounded-xl border bg-card p-6'>
          <div className='flex flex-col items-center gap-3 py-8 text-center'>
            <div
              className='flex h-12 w-12 items-center justify-center rounded-full'
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Icons.teams className='h-6 w-6' style={{ color: themeColor }} />
            </div>
            <div>
              <p className='font-medium'>Join {club.name}</p>
              <p className='text-sm text-muted-foreground'>
                Become a member to chat and participate
              </p>
            </div>
            {club.joinPolicy !== 'INVITE_ONLY' ? (
              <Button
                size='sm'
                className='mt-1'
                style={{ backgroundColor: themeColor }}
                onClick={onJoin}
                disabled={joining}
              >
                {joining
                  ? 'Joining...'
                  : club.joinPolicy === 'OPEN'
                    ? 'Join Club'
                    : 'Request to Join'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className='grid grid-cols-3 gap-3'>
        <div className='rounded-xl border bg-card p-4 text-center'>
          <Icons.teams className='mx-auto mb-1 h-5 w-5 text-muted-foreground' />
          <p className='text-lg font-bold'>{club.memberCountCache}</p>
          <p className='text-xs text-muted-foreground'>
            Member{club.memberCountCache !== 1 ? 's' : ''}
          </p>
        </div>
        <div className='rounded-xl border bg-card p-4 text-center'>
          <Icons.lock className='mx-auto mb-1 h-5 w-5 text-muted-foreground' />
          <p className='text-lg font-bold capitalize'>{formatJoinPolicy(club.joinPolicy)}</p>
          <p className='text-xs text-muted-foreground'>Join Policy</p>
        </div>
        <div className='rounded-xl border bg-card p-4 text-center'>
          <Icons.teams className='mx-auto mb-1 h-5 w-5 text-muted-foreground' />
          <p className='text-lg font-bold capitalize'>{club.scopeKind.toLowerCase()}</p>
          <p className='text-xs text-muted-foreground'>Scope</p>
        </div>
      </div>
    </div>
  )
}
