import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import type { Club } from '@/lib/clubs/types'
import { ClubFeed } from './club-feed'

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

      {(isMember || isOwner) && club.serverId ? (
        <ClubFeed serverId={club.serverId} themeColor={themeColor} canPost />
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
    </div>
  )
}
