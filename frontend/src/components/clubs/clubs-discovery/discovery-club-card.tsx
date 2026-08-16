'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useJoinClub } from '@/lib/clubs/queries'
import type { Club } from '@/lib/clubs/types'
import { messagesClubHref } from '@/lib/inbox/services/messages-href'

function clubInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

const JOIN_POLICY_LABEL: Record<string, string> = {
  OPEN: 'Join',
  BY_REQUEST: 'Request',
  INVITE_ONLY: 'Invite Only',
}

export interface DiscoveryClubCardProps {
  club: Club;
  isMember: boolean;
  compact?: boolean;
}

export function DiscoveryClubCard({ club, isMember = false, compact = false }: DiscoveryClubCardProps) {
  const joinMutation = useJoinClub()
  // Joining a BY_REQUEST club doesn't make you a member — it files a
  // request pending approval. These used to collapse into one `joined`
  // flag, so a "Request" click rendered "Joined! ✓" immediately, before
  // anyone had approved anything.
  const [joined, setJoined] = useState(false)
  const [requested, setRequested] = useState(false)
  const themeColor = club.themeColor || '#6366f1'
  const showJoinAction = !isMember && !joined && !requested && club.joinPolicy !== 'INVITE_ONLY'

  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    joinMutation.mutate(club.id, {
      onSuccess: (data) => {
        if (data?.status === 'PENDING') setRequested(true)
        else setJoined(true)
      }
    })
  }

  const avatar = (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold',
        compact ? 'h-9 w-9' : 'h-10 w-10'
      )}
      style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
    >
      {club.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.iconUrl} alt='' className='h-full w-full object-cover' />
      ) : (
        clubInitials(club.name)
      )}
    </div>
  )

  const actionButton = showJoinAction ? (
    <Button
      size='sm'
      variant={club.joinPolicy === 'OPEN' ? 'default' : 'outline'}
      className='h-7 shrink-0 rounded-full px-4 text-xs'
      style={club.joinPolicy === 'OPEN' ? { backgroundColor: themeColor } : undefined}
      onClick={handleJoin}
      disabled={joinMutation.isPending}
    >
      {joinMutation.isPending ? 'Joining...' : JOIN_POLICY_LABEL[club.joinPolicy]}
    </Button>
  ) : requested && !isMember ? (
    // Not clickable — a second request is a no-op the backend already
    // treats as idempotent, so there's nothing useful a click would do here.
    <span className='flex h-7 shrink-0 items-center gap-1 rounded-full border border-dashed px-4 text-xs text-muted-foreground'>
      <Icons.clock className='h-3 w-3' />
      Pending
    </span>
  ) : (
    // No handler — the click bubbles to the wrapping <Link>, which already
    // points at the club.
    <Button size='sm' variant='outline' className='h-7 shrink-0 rounded-full px-4 text-xs gap-1'>
      {joined && !isMember ? (
        <>
          <Icons.check className='h-3 w-3' />
          Joined!
        </>
      ) : (
        'Open'
      )}
    </Button>
  )

  const subtitle = [
    `${club.memberCountCache} member${club.memberCountCache !== 1 ? 's' : ''}`,
    club.faculty?.name,
  ]
    .filter(Boolean)
    .join(' · ')

  if (compact) {
    return (
      <Link
        href={messagesClubHref(club.slug)}
        className='group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20'
      >
        {avatar}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-1.5'>
            <h3 className='truncate text-sm font-semibold'>{club.name}</h3>
            {club.isOfficial && <Icons.circleCheck className='h-3.5 w-3.5 shrink-0 text-blue-500' />}
          </div>
          <p className='truncate text-xs text-muted-foreground'>{subtitle}</p>
        </div>
        {actionButton}
      </Link>
    )
  }

  return (
    <Link
      href={messagesClubHref(club.slug)}
      className='group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20'
    >
      <div className='flex items-center gap-3'>
        {avatar}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-1.5'>
            <h3 className='truncate text-sm font-semibold'>{club.name}</h3>
            {club.isOfficial && <Icons.circleCheck className='h-3.5 w-3.5 shrink-0 text-blue-500' />}
          </div>
          <p className='truncate text-xs text-muted-foreground'>{subtitle}</p>
        </div>
        {actionButton}
      </div>
      <p className='line-clamp-2 text-xs text-muted-foreground'>
        {club.tagline || club.description || 'No description yet.'}
      </p>
    </Link>
  )
}

export default DiscoveryClubCard
