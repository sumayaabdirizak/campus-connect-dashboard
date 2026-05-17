'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icons } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useJoinClub } from '../api/queries'
import { ClubAnimatedBanner } from './club-animated-banner'
import type { Club } from '../api/types'

function ClubInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

const JOIN_POLICY_LABEL: Record<string, string> = {
  OPEN: 'Join',
  BY_REQUEST: 'Request to Join',
  INVITE_ONLY: 'Invite Only',
}

export function ClubCard({
  club,
  isMember = false,
  compact = false,
}: {
  club: Club
  isMember?: boolean
  compact?: boolean
}) {
  const joinMutation = useJoinClub()
  const [joined, setJoined] = useState(false)
  const themeColor = club.themeColor || '#6366f1'

  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    joinMutation.mutate(club.id, {
      onSuccess: () => setJoined(true)
    })
  }

  return (
    <Link
      href={`/dashboard/clubs/${club.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-card',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
        compact && 'flex-row items-center'
      )}
    >
      {/* Banner */}
      {!compact && (
        <div className='relative h-28 w-full overflow-hidden'>
          {club.bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={club.bannerUrl}
                alt=''
                className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]'
              />
            </>
          ) : (
            <ClubAnimatedBanner themeColor={themeColor} className='h-full w-full'>
              <div className='flex h-full items-center justify-center'>
                <span
                  className='text-3xl font-bold text-white/20'
                >
                  {ClubInitials(club.name)}
                </span>
              </div>
            </ClubAnimatedBanner>
          )}
          {/* Bottom gradient */}
          <div
            className='absolute inset-x-0 bottom-0 h-14'
            style={{
              background: 'linear-gradient(to top, hsl(var(--card)), transparent)',
            }}
          />
          {/* Official badge */}
          {club.isOfficial && (
            <div className='absolute right-2 top-2 flex h-5 items-center gap-0.5 rounded-full bg-blue-500/90 px-1.5 text-[10px] font-medium text-white backdrop-blur-sm'>
              <Icons.circleCheck className='h-3 w-3' />
              Official
            </div>
          )}
        </div>
      )}

      {/* Icon (compact mode) */}
      {compact && (
        <div
          className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ml-3 text-xs font-bold transition-transform group-hover:scale-105'
          style={{
            backgroundColor: `${themeColor}20`,
            color: themeColor,
          }}
        >
          {club.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.iconUrl} alt='' className='h-full w-full rounded-lg object-cover' />
          ) : (
            ClubInitials(club.name)
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn('flex flex-1 flex-col gap-1.5 p-3', compact && 'py-2')}>
        <div className='flex items-center gap-2'>
          <h3 className='truncate text-sm font-semibold'>{club.name}</h3>
          {!compact && club.isOfficial && (
            <Icons.circleCheck className='h-3.5 w-3.5 shrink-0 text-blue-500' />
          )}
        </div>

        {club.tagline && !compact && (
          <p className='line-clamp-2 text-xs text-muted-foreground'>{club.tagline}</p>
        )}

        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <Icons.teams className='h-3 w-3' />
            {club.memberCountCache} member{club.memberCountCache !== 1 ? 's' : ''}
          </span>
          {club.scopeKind && (
            <Badge variant='outline' className='h-4 px-1 text-[10px]'>
              {club.scopeKind.toLowerCase()}
            </Badge>
          )}
        </div>

        {/* Interest tags */}
        {!compact && club.interests && club.interests.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-0.5'>
            {club.interests.slice(0, 3).map((tag) => (
              <span
                key={tag.slug}
                className='inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-medium'
                style={{
                  backgroundColor: `${themeColor}12`,
                  color: themeColor,
                }}
              >
                {tag.label}
              </span>
            ))}
            {club.interests.length > 3 && (
              <span className='text-[10px] text-muted-foreground'>
                +{club.interests.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      {!isMember && !joined && club.joinPolicy !== 'INVITE_ONLY' && (
        <div className={cn('px-3 pb-3', compact && 'pr-3 pb-0')}>
          <Button
            size='sm'
            variant={club.joinPolicy === 'OPEN' ? 'default' : 'outline'}
            className='h-7 w-full text-xs'
            style={
              club.joinPolicy === 'OPEN'
                ? { backgroundColor: themeColor }
                : undefined
            }
            onClick={handleJoin}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending
              ? 'Joining...'
              : JOIN_POLICY_LABEL[club.joinPolicy]}
          </Button>
        </div>
      )}

      {(isMember || joined) && !compact && (
        <div className='px-3 pb-3'>
          <div className='flex h-7 w-full items-center justify-center gap-1 rounded-md bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
            <Icons.check className='h-3 w-3' />
            {joined && !isMember ? 'Joined!' : 'Member'}
          </div>
        </div>
      )}

      {/* Theme accent line */}
      <div
        className='absolute bottom-0 left-0 right-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100'
        style={{ backgroundColor: themeColor }}
      />
    </Link>
  )
}
