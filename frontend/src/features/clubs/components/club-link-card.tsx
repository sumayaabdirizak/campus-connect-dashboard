'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { useInvitePreview, useAcceptInvite } from '../api/queries'
import type { AcceptInviteResponse } from '../api/types'

/**
 * Rich embed card rendered inline in chat when a user pastes a club invite URL.
 *
 * Detects URLs matching `/dashboard/clubs/invite/<token>` and renders a preview
 * card with the club's banner, name, member count, and a Join button.
 */
export function ClubLinkCard({ token }: { token: string }) {
  const { data, isLoading, error } = useInvitePreview(token)
  const acceptMutation = useAcceptInvite()
  const [acceptResult, setAcceptResult] = useState<AcceptInviteResponse | null>(null)

  // ── All markup uses <span> with display:block so the card can live inside
  // a <p> from the markdown renderer without violating HTML nesting rules
  // (<div> cannot be a descendant of <p>). ──

  if (isLoading) {
    return (
      <span className='my-1 block w-72 overflow-hidden rounded-lg border'>
        <span className='block h-16 w-full animate-pulse rounded-t-lg bg-accent' />
        <span className='block space-y-1.5 p-3'>
          <span className='block h-4 w-32 animate-pulse rounded-md bg-accent' />
          <span className='block h-3 w-48 animate-pulse rounded-md bg-accent' />
        </span>
      </span>
    )
  }

  if (error || !data?.club) {
    return (
      <span className='my-1 inline-flex w-72 items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground'>
        <Icons.alertCircle className='h-3.5 w-3.5 shrink-0' />
        Invite expired or invalid
      </span>
    )
  }

  const { club, inviter } = data
  const themeColor = club.themeColor || '#6366f1'

  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    acceptMutation.mutate(token, {
      onSuccess: (res) => setAcceptResult(res)
    })
  }

  return (
    <span className='my-1 block w-72 overflow-hidden rounded-lg border transition-shadow hover:shadow-sm'>
      {/* Mini banner */}
      <span
        className='relative block h-14 w-full'
        style={{
          background: club.bannerUrl
            ? `url(${club.bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${themeColor}40, ${themeColor}15)`,
        }}
      >
        <span
          className='absolute inset-x-0 bottom-0 block h-6'
          style={{
            background: 'linear-gradient(to top, hsl(var(--card)), transparent)',
          }}
        />
      </span>

      <span className='relative -mt-2 block px-3 pb-3'>
        <span className='flex items-start justify-between'>
          <span className='min-w-0 flex-1'>
            <span className='flex items-center gap-1.5'>
              <span className='truncate text-sm font-semibold'>{club.name}</span>
              {club.isOfficial && (
                <Icons.circleCheck className='h-3 w-3 shrink-0 text-blue-500' />
              )}
            </span>
            {club.tagline && (
              <span className='block truncate text-[11px] text-muted-foreground'>{club.tagline}</span>
            )}
          </span>
        </span>

        <span className='mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground'>
          <span className='flex items-center gap-0.5'>
            <Icons.teams className='h-3 w-3' />
            {club.memberCountCache} members
          </span>
          {club.scopeKind && (
            <Badge variant='outline' className='h-3.5 px-1 text-[8px]'>
              {club.scopeKind.toLowerCase()}
            </Badge>
          )}
          {inviter && (
            <span className='truncate'>
              via {inviter.full_name}
            </span>
          )}
        </span>

        <span className='mt-2 block'>
          {acceptResult?.joined ? (
            <Link
              href={`/dashboard/clubs/${club.slug}`}
              className='inline-block'
            >
              <Button size='sm' variant='outline' className='h-6 text-[11px]'>
                <Icons.check className='mr-1 h-3 w-3' />
                {acceptResult.alreadyMember ? 'Already Joined' : 'Joined!'}
              </Button>
            </Link>
          ) : (
            <Button
              size='sm'
              className='h-6 text-[11px]'
              style={{ backgroundColor: themeColor }}
              onClick={handleJoin}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />
              ) : null}
              Join
            </Button>
          )}
        </span>
      </span>
    </span>
  )
}

/**
 * Extracts a club invite token from a URL string, if it matches the pattern.
 * Returns null if the URL is not a club invite.
 */
export function extractClubInviteToken(url: string): string | null {
  // Match /dashboard/clubs/invite/<token> or full URLs with that path
  const match = url.match(/\/dashboard\/clubs\/invite\/([A-Za-z0-9_-]+)/)
  return match?.[1] ?? null
}
