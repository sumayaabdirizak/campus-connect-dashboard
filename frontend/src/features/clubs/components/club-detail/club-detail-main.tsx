import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import type { Club } from '@/features/clubs/api/types'
import { ClubFeed } from './club-feed/club-feed'

type Props = {
  club: Club
  themeColor: string
  isMember: boolean
  isOwner: boolean
  joinRequestPending?: boolean
  joining: boolean
  onJoin: () => void
  hideJoinActions?: boolean
}

export function ClubDetailMain({
  club,
  themeColor,
  isMember,
  isOwner,
  joinRequestPending = false,
  joining,
  onJoin,
  hideJoinActions = false,
}: Props) {
  const canSeeFeed = (isMember || isOwner) && club.serverId && club.status === 'APPROVED'

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

      {canSeeFeed ? (
        <ClubFeed serverId={club.serverId!} themeColor={themeColor} />
      ) : !isMember && !isOwner ? (
        <JoinPrompt
          club={club}
          themeColor={themeColor}
          joinRequestPending={joinRequestPending}
          joining={joining}
          onJoin={onJoin}
          hideJoinActions={hideJoinActions}
        />
      ) : (
        <div className='rounded-xl border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center'>
          <Icons.alertCircle className='mx-auto mb-2 h-8 w-8 text-[#98A2B3]' />
          <p className='text-sm font-medium text-[#344054]'>Feed not ready</p>
          <p className='mt-1 text-xs text-[#667085]'>
            {club.status === 'PENDING'
              ? 'This club is awaiting approval. The feed unlocks once it is approved.'
              : 'Discussion space is still being set up.'}
          </p>
        </div>
      )}
    </div>
  )
}

function JoinPrompt({
  club,
  themeColor,
  joinRequestPending,
  joining,
  onJoin,
  hideJoinActions = false,
}: {
  club: Club
  themeColor: string
  joinRequestPending: boolean
  joining: boolean
  onJoin: () => void
  hideJoinActions?: boolean
}) {
  return (
    <div className='space-y-4'>
      {club.description ? (
        <div className='rounded-xl border border-[#E5E7EB] bg-white p-5'>
          <h3 className='mb-2 text-sm font-semibold text-[#101828]'>About</h3>
          <p className='text-sm leading-relaxed text-[#667085]'>{club.description}</p>
        </div>
      ) : null}
      <div className='rounded-xl border border-[#E5E7EB] bg-white p-6'>
        <div className='flex flex-col items-center gap-3 py-6 text-center'>
          <div
            className='flex h-12 w-12 items-center justify-center rounded-full'
            style={{ backgroundColor: `${themeColor}15` }}
          >
            <Icons.teams className='h-6 w-6' style={{ color: themeColor }} />
          </div>
          <div>
            <p className='font-medium text-[#101828]'>
              {hideJoinActions
                ? club.name
                : joinRequestPending
                  ? `Request pending for ${club.name}`
                  : `Join ${club.name}`}
            </p>
            <p className='text-sm text-[#667085]'>
              {hideJoinActions
                ? 'Members-only content — feed unlocks once a member joins.'
                : joinRequestPending
                  ? 'A moderator will review your request soon.'
                  : 'Become a member to see posts and share updates'}
            </p>
          </div>
          {hideJoinActions ? null : joinRequestPending ? (
            <Button size='sm' variant='outline' disabled className='mt-1 text-[#667085]'>
              Pending
            </Button>
          ) : club.joinPolicy !== 'INVITE_ONLY' ? (
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
          ) : (
            <p className='text-xs text-[#98A2B3]'>This club is invite-only</p>
          )}
        </div>
      </div>
    </div>
  )
}
