'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Icons } from '@/components/icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClubCreateDialog } from '@/features/clubs/components/club-create-dialog'
import { useClubs, useMyClubs, useJoinClub } from '@/features/clubs/api/queries'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import type { Club } from '@/features/clubs/api/types'

type SortMode = 'popular' | 'new' | 'active'
type TabMode = 'all' | 'mine'

function ClubListRow({
  club,
  index,
  isMember,
  onJoin,
  isJoining,
}: {
  club: Club
  index: number
  isMember: boolean
  onJoin: () => void
  isJoining: boolean
}) {
  const themeColor = club.themeColor || '#6366f1'
  const initials = club.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')

  return (
    <div className='group flex items-center gap-4 border-b px-4 py-3 transition-colors hover:bg-muted/50 last:border-b-0'>
      {/* Rank number */}
      <span className='w-6 shrink-0 text-center text-sm font-medium text-muted-foreground'>
        {index + 1}
      </span>

      {/* Upvote-style indicator (member count trend) */}
      <div className='flex shrink-0 flex-col items-center gap-0.5'>
        <Icons.chevronUp className='h-4 w-4 text-muted-foreground/50' />
        <span className='text-xs font-bold text-foreground'>
          {club.memberCountCache}
        </span>
      </div>

      {/* Club icon */}
      <Link
        href={`/dashboard/clubs/${club.slug}`}
        className='shrink-0'
      >
        <div
          className='flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-transform group-hover:scale-105'
          style={{
            backgroundColor: `${themeColor}18`,
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
      </Link>

      {/* Club info */}
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='flex items-center gap-2'>
          <Link
            href={`/dashboard/clubs/${club.slug}`}
            className='truncate text-sm font-semibold transition-colors hover:underline'
          >
            {club.name}
          </Link>
          {club.isOfficial && (
            <Icons.circleCheck className='h-3.5 w-3.5 shrink-0 text-blue-500' />
          )}
          <Badge
            variant='outline'
            className='h-5 shrink-0 px-1.5 text-[10px] capitalize'
          >
            {club.joinPolicy.toLowerCase().replace('_', ' ')}
          </Badge>
          {club.status === 'PENDING' && (
            <Badge
              variant='secondary'
              className='h-5 shrink-0 bg-yellow-100 px-1.5 text-[10px] text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'
            >
              Pending
            </Badge>
          )}
        </div>
        <p className='truncate text-xs text-muted-foreground'>
          {club.tagline || club.description || 'No description'}
        </p>
        {/* Meta row */}
        <div className='mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <Icons.teams className='h-3 w-3' />
            {club.memberCountCache} member{club.memberCountCache !== 1 ? 's' : ''}
          </span>
          {club.faculty && (
            <span className='flex items-center gap-1'>
              <Icons.hash className='h-3 w-3' />
              {club.faculty.name}
            </span>
          )}
          {club.interests && club.interests.length > 0 && (
            <span className='hidden items-center gap-1 sm:flex'>
              <Icons.hash className='h-3 w-3' />
              {club.interests.slice(0, 2).map((t) => t.label).join(', ')}
              {club.interests.length > 2 && ` +${club.interests.length - 2}`}
            </span>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className='flex shrink-0 items-center gap-2'>
        {isMember ? (
          <Link href={club.serverId ? `/dashboard/chat/${club.serverId}` : `/dashboard/clubs/${club.slug}`}>
            <Button
              size='sm'
              variant='outline'
              className='h-8 gap-1.5 text-xs'
            >
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

function ListSkeleton() {
  return (
    <div className='divide-y'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className='flex items-center gap-4 px-4 py-3'>
          <Skeleton className='h-4 w-6' />
          <Skeleton className='h-6 w-6' />
          <Skeleton className='h-10 w-10 rounded-full' />
          <div className='flex flex-1 flex-col gap-1.5'>
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-3 w-64' />
          </div>
          <Skeleton className='h-8 w-16 rounded-md' />
        </div>
      ))}
    </div>
  )
}

export default function ClubsDiscoveryPage() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('popular')
  const [tab, setTab] = useState<TabMode>('all')

  const user = useAuthStore((s) => s.user)
  const isDean = user?.role === 'DEAN' || user?.role === 'SUPER_ADMIN'

  const { data: allClubs, isLoading } = useClubs({
    q: search || undefined,
    sort,
    limit: 50,
  })
  const { data: myClubs } = useMyClubs()
  const joinMutation = useJoinClub()

  const myClubIds = useMemo(() => {
    const ids = new Set<number>()
    for (const c of myClubs?.owned ?? []) ids.add(c.id)
    for (const c of myClubs?.memberOf ?? []) ids.add(c.id)
    return ids
  }, [myClubs])

  // Deduplicated list of my clubs
  const myClubsList = useMemo(() => {
    const seen = new Set<number>()
    const result: Club[] = []
    for (const c of [...(myClubs?.owned ?? []), ...(myClubs?.memberOf ?? [])]) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        result.push(c)
      }
    }
    return result
  }, [myClubs])

  const displayClubs = tab === 'mine' ? myClubsList : (allClubs?.clubs ?? [])

  return (
    <div className='flex h-full flex-col'>
      {/* ── HEADER BAR ──────────────────────────────────────────── */}
      <div className='shrink-0 border-b bg-card'>
        <div className='mx-auto flex max-w-4xl items-center justify-between px-4 py-3'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10'>
              <Icons.teams className='h-5 w-5 text-primary' />
            </div>
            <div>
              <h1 className='text-lg font-semibold leading-tight'>Communities</h1>
              <p className='text-xs text-muted-foreground'>
                {allClubs?.clubs?.length ?? 0} clubs to explore
              </p>
            </div>
          </div>
          <ClubCreateDialog isDean={isDean} />
        </div>
      </div>

      <ScrollArea className='flex-1'>
        <div className='mx-auto max-w-4xl px-4 py-4'>
          {/* ── TAB BAR + SEARCH ──────────────────────────────────── */}
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            {/* Tabs */}
            <div className='flex items-center gap-1 rounded-lg border bg-muted/50 p-1'>
              <button
                type='button'
                onClick={() => setTab('all')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All Clubs
              </button>
              <button
                type='button'
                onClick={() => setTab('mine')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === 'mine'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                My Clubs
                {myClubIds.size > 0 && (
                  <span className='flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground'>
                    {myClubIds.size}
                  </span>
                )}
              </button>
            </div>

            {/* Search + sort */}
            <div className='flex items-center gap-2'>
              <div className='relative'>
                <Icons.search className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='Search...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='h-8 w-48 pl-8 text-xs'
                />
              </div>
              <div className='flex gap-0.5 rounded-lg border p-0.5'>
                {(['popular', 'new', 'active'] as SortMode[]).map((s) => (
                  <button
                    key={s}
                    type='button'
                    onClick={() => setSort(s)}
                    className={cn(
                      'rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors',
                      sort === s
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── CLUB LIST ─────────────────────────────────────────── */}
          <div className='overflow-hidden rounded-xl border bg-card'>
            {/* List header */}
            <div className='flex items-center gap-4 border-b bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
              <span className='w-6 text-center'>#</span>
              <span className='w-10' />
              <span className='w-10' />
              <span className='flex-1'>Club</span>
              <span className='w-20 text-right'>Action</span>
            </div>

            {isLoading ? (
              <ListSkeleton />
            ) : displayClubs.length > 0 ? (
              displayClubs.map((club, i) => (
                <ClubListRow
                  key={club.id}
                  club={club}
                  index={i}
                  isMember={myClubIds.has(club.id)}
                  onJoin={() => joinMutation.mutate(club.id)}
                  isJoining={joinMutation.isPending}
                />
              ))
            ) : (
              <div className='flex flex-col items-center justify-center gap-2 py-16'>
                {tab === 'mine' ? (
                  <>
                    <Icons.teams className='h-10 w-10 text-muted-foreground/30' />
                    <p className='text-sm font-medium text-muted-foreground'>
                      You haven't joined any clubs yet
                    </p>
                    <Button
                      size='sm'
                      variant='outline'
                      className='mt-1 text-xs'
                      onClick={() => setTab('all')}
                    >
                      Browse All Clubs
                    </Button>
                  </>
                ) : (
                  <>
                    <Icons.search className='h-10 w-10 text-muted-foreground/30' />
                    <p className='text-sm font-medium text-muted-foreground'>
                      {search ? 'No clubs match your search' : 'No clubs available yet'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── TRENDING SIDEBAR-STYLE INFO ────────────────────── */}
          {tab === 'all' && !search && (allClubs?.clubs?.length ?? 0) > 0 && (
            <div className='mt-4 rounded-xl border bg-card p-4'>
              <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
                <Icons.sparkles className='h-3.5 w-3.5' />
                ABOUT COMMUNITIES
              </div>
              <p className='mt-2 text-xs leading-relaxed text-muted-foreground'>
                Clubs are student-run communities where you can discuss topics you care about,
                meet people with shared interests, and collaborate on projects. Join open clubs
                instantly or request access to private ones.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
