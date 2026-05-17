'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useClubDetail, useJoinClub, useLeaveClub } from '@/features/clubs/api/queries'
import { ClubPendingBanner } from '@/features/clubs/components/club-pending-banner'
import { ClubAnimatedBanner } from '@/features/clubs/components/club-animated-banner'
import { ClubRoleBadge } from '@/features/clubs/components/club-role-badge'
import { useAuthStore } from '@/lib/auth-store'
import type { ClubRole } from '@/features/clubs/api/types'

export default function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { data, isLoading } = useClubDetail(slug)
  const user = useAuthStore((s) => s.user)
  const joinMutation = useJoinClub()
  const leaveMutation = useLeaveClub()

  if (isLoading) {
    return (
      <div className='flex h-full flex-col'>
        <Skeleton className='h-40 w-full' />
        <div className='mx-auto flex w-full max-w-5xl gap-6 px-4 py-4'>
          <div className='flex-1 space-y-3'>
            <Skeleton className='h-10 w-64' />
            <Skeleton className='h-32 w-full rounded-xl' />
            <Skeleton className='h-32 w-full rounded-xl' />
          </div>
          <div className='hidden w-80 space-y-3 lg:block'>
            <Skeleton className='h-48 w-full rounded-xl' />
            <Skeleton className='h-32 w-full rounded-xl' />
          </div>
        </div>
      </div>
    )
  }

  if (!data?.club) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3'>
        <Icons.alertCircle className='h-10 w-10 text-muted-foreground/50' />
        <h2 className='text-sm font-medium'>Club not found</h2>
        <Link href='/dashboard/clubs'>
          <Button size='sm' variant='outline'>
            Back to Clubs
          </Button>
        </Link>
      </div>
    )
  }

  const { club, isMember, isOwner, membershipRole } = data
  const themeColor = club.themeColor || '#6366f1'
  const isPending = club.status === 'PENDING'

  const handleJoin = () => joinMutation.mutate(club.id)
  const handleLeave = () => leaveMutation.mutate(club.id)

  const roleLabel: ClubRole | null = isOwner
    ? 'OWNER'
    : membershipRole === 'ADMIN'
      ? 'MODERATOR'
      : isMember
        ? 'MEMBER'
        : null

  const initials = club.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <ScrollArea className='h-full'>
      <div
        className='min-h-full'
        style={{ '--club-accent': themeColor } as React.CSSProperties}
      >
        {isPending && <ClubPendingBanner clubName={club.name} />}

        {/* ── FULL-WIDTH BANNER ──────────────────────────────────── */}
        <div className='relative h-40 w-full overflow-hidden'>
          {club.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.bannerUrl}
              alt=''
              className='h-full w-full object-cover'
            />
          ) : (
            <ClubAnimatedBanner themeColor={themeColor} className='h-full w-full'>
              <div className='flex h-full items-center justify-center'>
                <span className='text-6xl font-bold text-white/8'>
                  {initials}
                </span>
              </div>
            </ClubAnimatedBanner>
          )}
          {/* Bottom fade */}
          <div
            className='absolute inset-x-0 bottom-0 h-20'
            style={{
              background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
            }}
          />
          {/* Back button */}
          <Link
            href='/dashboard/clubs'
            className='absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background'
          >
            <Icons.chevronLeft className='h-4 w-4' />
          </Link>
        </div>

        {/* ── COMMUNITY HEADER BAR ───────────────────────────────── */}
        <div className='mx-auto max-w-5xl px-4'>
          <div className='-mt-8 flex items-end gap-4'>
            {/* Club icon */}
            <div
              className='flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-background text-2xl font-bold shadow-lg'
              style={{
                backgroundColor: `${themeColor}20`,
                color: themeColor,
              }}
            >
              {club.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={club.iconUrl}
                  alt=''
                  className='h-full w-full rounded-full object-cover'
                />
              ) : (
                initials
              )}
            </div>

            {/* Name + tagline */}
            <div className='flex-1 pb-1'>
              <div className='flex items-center gap-2'>
                <h1 className='text-2xl font-bold tracking-tight'>{club.name}</h1>
                {club.isOfficial && (
                  <Icons.circleCheck className='h-5 w-5 text-blue-500' />
                )}
                {roleLabel && (
                  <ClubRoleBadge role={roleLabel} themeColor={themeColor} />
                )}
              </div>
              {club.tagline && (
                <p className='text-sm text-muted-foreground'>{club.tagline}</p>
              )}
            </div>

            {/* Action buttons — Reddit-style right-aligned */}
            <div className='flex items-center gap-2 pb-1'>
              {(isMember || isOwner) && club.serverId && (
                <Link href={`/dashboard/chat/${club.serverId}`}>
                  <Button
                    size='sm'
                    className='gap-1.5 shadow-sm'
                    style={{ backgroundColor: themeColor }}
                  >
                    <Icons.chat className='h-3.5 w-3.5' />
                    Open Chat
                  </Button>
                </Link>
              )}
              {!isMember && !isOwner && !isPending && club.joinPolicy !== 'INVITE_ONLY' && (
                <Button
                  size='sm'
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                  style={{ backgroundColor: themeColor }}
                  className='shadow-sm'
                >
                  {joinMutation.isPending
                    ? 'Joining...'
                    : club.joinPolicy === 'OPEN'
                      ? 'Join'
                      : 'Request to Join'}
                </Button>
              )}
              {isMember && !isOwner && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleLeave}
                  disabled={leaveMutation.isPending}
                >
                  {leaveMutation.isPending ? 'Leaving...' : 'Leave'}
                </Button>
              )}
              {(isOwner || membershipRole === 'ADMIN') && (
                <Link href={`/dashboard/clubs/${slug}/manage`}>
                  <Button size='sm' variant='outline' className='gap-1.5'>
                    <Icons.settings className='h-3.5 w-3.5' />
                    Manage
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN LAYOUT (Reddit-style) ───────────────────── */}
        <div className='mx-auto flex max-w-5xl gap-6 px-4 py-6'>
          {/* ── LEFT COLUMN: Main content ──────────────────────── */}
          <div className='flex-1 min-w-0 space-y-4'>
            {/* Interest tags strip */}
            {club.interests && club.interests.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {club.interests.map((tag) => (
                  <span
                    key={tag.slug}
                    className='inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium'
                    style={{
                      backgroundColor: `${themeColor}12`,
                      color: themeColor,
                    }}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            )}

            {/* About card */}
            {club.description && (
              <div className='rounded-xl border bg-card p-5'>
                <h3 className='mb-2 text-sm font-semibold'>About this community</h3>
                <p className='text-sm leading-relaxed text-muted-foreground'>
                  {club.description}
                </p>
              </div>
            )}

            {/* Activity / empty state */}
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
                    <Button
                      size='sm'
                      className='mt-1 gap-1.5'
                      style={{ backgroundColor: themeColor }}
                    >
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
                  {club.joinPolicy !== 'INVITE_ONLY' && (
                    <Button
                      size='sm'
                      className='mt-1'
                      style={{ backgroundColor: themeColor }}
                      onClick={handleJoin}
                      disabled={joinMutation.isPending}
                    >
                      {joinMutation.isPending
                        ? 'Joining...'
                        : club.joinPolicy === 'OPEN'
                          ? 'Join Club'
                          : 'Request to Join'}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Stats cards row */}
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
                <p className='text-lg font-bold capitalize'>
                  {club.joinPolicy.toLowerCase().replace('_', ' ')}
                </p>
                <p className='text-xs text-muted-foreground'>Join Policy</p>
              </div>
              <div className='rounded-xl border bg-card p-4 text-center'>
                <Icons.teams className='mx-auto mb-1 h-5 w-5 text-muted-foreground' />
                <p className='text-lg font-bold capitalize'>
                  {club.scopeKind.toLowerCase()}
                </p>
                <p className='text-xs text-muted-foreground'>Scope</p>
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ──────────────────────────────────── */}
          <aside className='hidden w-80 shrink-0 space-y-4 lg:block'>
            {/* Rules card */}
            {club.rules && (
              <div
                className='overflow-hidden rounded-xl border'
                style={{ borderColor: `${themeColor}30` }}
              >
                <div
                  className='px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white'
                  style={{ backgroundColor: themeColor }}
                >
                  Club Rules
                </div>
                <div className='divide-y p-0'>
                  {club.rules.split('\n').filter(Boolean).map((rule, i) => (
                    <div key={i} className='flex gap-3 px-4 py-3'>
                      <span
                        className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold'
                        style={{
                          backgroundColor: `${themeColor}15`,
                          color: themeColor,
                        }}
                      >
                        {i + 1}
                      </span>
                      <p className='text-sm leading-relaxed text-muted-foreground'>
                        {rule.trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community info card */}
            <div className='rounded-xl border bg-card'>
              <div className='border-b px-4 py-3 text-sm font-semibold'>
                Community Info
              </div>
              <div className='space-y-3 p-4'>
                {club.faculty && (
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-muted-foreground'>Faculty</span>
                    <span className='text-sm font-medium'>{club.faculty.name}</span>
                  </div>
                )}
                {club.owner && (
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-muted-foreground'>Created by</span>
                    <div className='flex items-center gap-1.5'>
                      <Icons.pro className='h-3 w-3 text-amber-500' />
                      <span className='text-sm font-medium'>{club.owner.full_name}</span>
                    </div>
                  </div>
                )}
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-muted-foreground'>Members</span>
                  <span className='text-sm font-medium'>{club.memberCountCache}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-muted-foreground'>Join Policy</span>
                  <span className='text-sm font-medium capitalize'>
                    {club.joinPolicy.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
                {club.status === 'PENDING' && (
                  <div className='flex items-center gap-1.5 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'>
                    <Icons.alertCircle className='h-3.5 w-3.5' />
                    Pending approval
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            {(isMember || isOwner) && (
              <div className='rounded-xl border bg-card'>
                <div className='border-b px-4 py-3 text-sm font-semibold'>
                  Quick Links
                </div>
                <div className='p-2'>
                  {club.serverId && (
                    <Link
                      href={`/dashboard/chat/${club.serverId}`}
                      className='flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted'
                    >
                      <Icons.chat className='h-4 w-4 text-muted-foreground' />
                      Open Chat
                    </Link>
                  )}
                  {(isOwner || membershipRole === 'ADMIN') && (
                    <Link
                      href={`/dashboard/clubs/${slug}/manage`}
                      className='flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted'
                    >
                      <Icons.settings className='h-4 w-4 text-muted-foreground' />
                      Manage Club
                    </Link>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </ScrollArea>
  )
}
