'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icons } from '@/components/icons'
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
}

export interface DiscoveryClubCardProps {
  club: Club
  isMember: boolean
  compact?: boolean
}

export function DiscoveryClubCard({
  club,
  isMember = false,
  compact = false,
}: DiscoveryClubCardProps) {
  const joinMutation = useJoinClub()
  // Joining a BY_REQUEST club doesn't make you a member — it files a
  // request pending approval. These used to collapse into one `joined`
  // flag, so a "Request" click rendered "Joined! ✓" immediately, before
  // anyone had approved anything.
  const [joined, setJoined] = useState(false)
  const [requested, setRequested] = useState(false)
  const themeColor = club.themeColor || '#3B82F6'
  const showJoinAction =
    !isMember && !joined && !requested && club.joinPolicy !== 'INVITE_ONLY'

  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    joinMutation.mutate(club.id, {
      onSuccess: (data) => {
        if (data?.status === 'PENDING') setRequested(true)
        else setJoined(true)
      },
    })
  }

  const avatar = (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold ring-1 ring-black/5',
        compact ? 'size-10' : 'size-12'
      )}
      style={{ backgroundColor: `${themeColor}22`, color: themeColor }}
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
    <button
      type='button'
      onClick={handleJoin}
      disabled={joinMutation.isPending}
      className={cn(
        'inline-flex h-7 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-all duration-200 disabled:opacity-60',
        club.joinPolicy === 'OPEN'
          ? 'bg-primary text-white hover:bg-[#2563EB] hover:shadow'
          : 'bg-primary/10 text-[#2563EB] hover:bg-[#DBEAFE]'
      )}
    >
      {joinMutation.isPending ? '…' : JOIN_POLICY_LABEL[club.joinPolicy]}
    </button>
  ) : requested && !isMember ? (
    <span className='inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-muted px-3.5 text-xs font-medium text-muted-foreground'>
      <Icons.clock className='size-3' />
      Pending
    </span>
  ) : (
    <span className='inline-flex h-7 shrink-0 items-center rounded-full bg-muted px-3.5 text-xs font-medium text-foreground transition-colors group-hover:bg-[#E4E7EC]'>
      {joined && !isMember ? (
        <span className='flex items-center gap-1 text-primary'>
          <Icons.check className='size-3' />
          Joined
        </span>
      ) : (
        'Open'
      )}
    </span>
  )

  const subtitle = [
    `${club.memberCountCache} member${club.memberCountCache !== 1 ? 's' : ''}`,
    club.faculty?.name,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      href={messagesClubHref(club.slug)}
      className={cn(
        'group flex min-w-0 items-center gap-3 border border-border bg-card transition-all duration-200',
        'hover:border-border hover:shadow-[0_2px_8px_rgba(16,24,40,0.08)]',
        compact ? 'rounded-xl px-3 py-2.5' : 'rounded-xl p-3.5'
      )}
    >
      {avatar}
      <div className='min-w-0 flex-1'>
        <div className='flex min-w-0 items-center gap-1.5'>
          <h3 className='truncate text-[13px] font-semibold text-foreground'>{club.name}</h3>
          {club.isOfficial ? (
            <Icons.circleCheck className='size-3.5 shrink-0 text-primary' />
          ) : null}
        </div>
        <p className='truncate text-xs font-medium text-foreground'>{subtitle}</p>
        {!compact && (club.tagline || club.description) ? (
          <p className='mt-0.5 line-clamp-1 text-xs text-muted-foreground'>
            {club.tagline || club.description}
          </p>
        ) : null}
      </div>
      {actionButton}
    </Link>
  )
}

export default DiscoveryClubCard
