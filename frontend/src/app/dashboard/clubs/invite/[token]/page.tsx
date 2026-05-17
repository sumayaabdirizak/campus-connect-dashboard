'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Icons } from '@/components/icons'
import { useInvitePreview, useAcceptInvite } from '@/features/clubs/api/queries'
import type { AcceptInviteResponse } from '@/features/clubs/api/types'

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const { data, isLoading, error } = useInvitePreview(token)
  const acceptMutation = useAcceptInvite()
  const [acceptResult, setAcceptResult] = useState<AcceptInviteResponse | null>(null)

  const handleAccept = () => {
    acceptMutation.mutate(token, {
      onSuccess: (res) => setAcceptResult(res)
    })
  }

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='w-full max-w-sm space-y-4'>
          <Skeleton className='h-40 w-full rounded-xl' />
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-10 w-full' />
        </div>
      </div>
    )
  }

  if (error || !data?.club) {
    const errorMsg = (error as Error)?.message ?? ''
    const isExpired = errorMsg.includes('expired')
    const isRevoked = errorMsg.includes('revoked')

    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <Icons.alertCircle className='h-12 w-12 text-muted-foreground/50' />
          <h2 className='text-lg font-semibold'>
            {isExpired
              ? 'Invite Expired'
              : isRevoked
                ? 'Invite Revoked'
                : 'Invite Not Found'}
          </h2>
          <p className='max-w-xs text-sm text-muted-foreground'>
            {isExpired
              ? 'This invite link has expired. Ask the club owner for a new one.'
              : isRevoked
                ? 'This invite has been revoked by the club moderators.'
                : 'This invite link is invalid or the club is no longer available.'}
          </p>
          <Link href='/dashboard/clubs'>
            <Button variant='outline' size='sm'>
              Browse Clubs
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const { club, inviter } = data
  const themeColor = club.themeColor || '#6366f1'

  // Already joined
  if (acceptResult?.joined) {
    const slug = acceptResult.club?.slug ?? club.slug
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <div
            className='flex h-16 w-16 items-center justify-center rounded-2xl text-2xl'
            style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
          >
            <Icons.check className='h-8 w-8' />
          </div>
          <div>
            <h2 className='text-lg font-semibold'>
              {acceptResult.alreadyMember
                ? 'Already a Member!'
                : 'Welcome to the Club!'}
            </h2>
            <p className='text-sm text-muted-foreground'>
              You&apos;re now a member of <strong>{club.name}</strong>
            </p>
          </div>
          <div className='flex gap-2'>
            <Link href={`/dashboard/clubs/${slug}`}>
              <Button variant='outline' size='sm'>
                View Club
              </Button>
            </Link>
            {acceptResult.club?.serverId && (
              <Link href={`/dashboard/chat/${acceptResult.club.serverId}`}>
                <Button size='sm' style={{ backgroundColor: themeColor }}>
                  <Icons.chat className='mr-1.5 h-3.5 w-3.5' />
                  Open Chat
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full items-center justify-center'>
      <div className='w-full max-w-sm overflow-hidden rounded-xl border shadow-lg'>
        {/* Banner */}
        <div
          className='relative h-32 w-full overflow-hidden'
          style={{
            background: club.bannerUrl
              ? `url(${club.bannerUrl}) center/cover`
              : `linear-gradient(135deg, ${themeColor}50, ${themeColor}20, transparent)`,
          }}
        >
          <div
            className='absolute inset-x-0 bottom-0 h-16'
            style={{
              background: 'linear-gradient(to top, hsl(var(--card)), transparent)',
            }}
          />
        </div>

        <div className='space-y-4 px-5 pb-5 -mt-6 relative'>
          {/* Club icon */}
          <div
            className='flex h-14 w-14 items-center justify-center rounded-xl border-4 border-card text-lg font-bold shadow-sm'
            style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
          >
            {club.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={club.iconUrl}
                alt=''
                className='h-full w-full rounded-lg object-cover'
              />
            ) : (
              club.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('')
            )}
          </div>

          {/* Club info */}
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-lg font-semibold'>{club.name}</h2>
              {club.isOfficial && (
                <Icons.circleCheck className='h-4 w-4 text-blue-500' />
              )}
            </div>
            {club.tagline && (
              <p className='text-sm text-muted-foreground'>{club.tagline}</p>
            )}
          </div>

          {/* Stats */}
          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Icons.teams className='h-3.5 w-3.5' />
              {club.memberCountCache} member{club.memberCountCache !== 1 ? 's' : ''}
            </span>
            {club.scopeKind && (
              <Badge variant='outline' className='text-[10px]'>
                {club.scopeKind.toLowerCase()}
              </Badge>
            )}
          </div>

          {/* Inviter */}
          {inviter && (
            <p className='text-xs text-muted-foreground'>
              Invited by <strong>{inviter.full_name}</strong>
            </p>
          )}

          {/* Accept button */}
          <Button
            className='w-full'
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
            style={{ backgroundColor: themeColor }}
          >
            {acceptMutation.isPending ? (
              <>
                <Icons.spinner className='mr-1.5 h-4 w-4 animate-spin' />
                Joining...
              </>
            ) : (
              'Accept Invite & Join'
            )}
          </Button>

          {/* Expiry notice */}
          {data.expiresAt && (
            <p className='text-center text-[10px] text-muted-foreground'>
              This invite expires on{' '}
              {new Date(data.expiresAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
