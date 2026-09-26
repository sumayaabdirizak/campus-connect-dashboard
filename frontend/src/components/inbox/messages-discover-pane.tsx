'use client'

import { useMemo, useState } from 'react'
import { List, Grid3x3 } from 'lucide-react'
import { Input } from '@/features/ui/components/input'
import { ScrollArea } from '@/features/ui/components/scroll-area'
import { Icons } from '@/components/icons'
import {
  useClubs,
  useMyClubs,
  useRecommendedClubs,
} from '@/lib/clubs/queries'
import type { Club } from '@/lib/clubs/types'
import { DiscoveryClubCard } from '@/components/clubs/clubs-discovery/discovery-club-card'
import { DiscoverMyApplications } from '@/components/clubs/clubs-discovery/discover-my-applications'
import { DiscoverPendingApprovalsLink } from '@/components/clubs/clubs-discovery/discover-pending-approvals-link'
import { ClubCreateDialog } from '@/components/clubs/club-create-dialog'
import { isDeanRole, isSuperAdminRole } from '@shared/roles'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

/** Clubs discovery embedded in Messages right pane. */
export function MessagesDiscoverPane() {
  const [q, setQ] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const user = useAuthStore((s) => s.user)
  // AO manages clubs via nav admin, not Messages Discover (Discover is hidden for AO).
  const isSuperAdmin = isSuperAdminRole(user?.role)
  const isDean = isDeanRole(user?.role) || isSuperAdmin

  const { data: catalog, isLoading } = useClubs({
    q: q.trim() || undefined,
    sort: 'popular',
    limit: 30,
  })
  const { data: mine } = useMyClubs()
  const { data: recommended } = useRecommendedClubs(12)

  const myIds = useMemo(() => {
    const ids = new Set<number>()
    for (const c of mine?.owned ?? []) ids.add(c.id)
    for (const c of mine?.memberOf ?? []) ids.add(c.id)
    return ids
  }, [mine])

  const myApplications = useMemo(
    () =>
      (mine?.owned ?? []).filter(
        (c) => c.status === 'PENDING' || c.status === 'REJECTED'
      ),
    [mine]
  )

  // Live clubs the viewer belongs to — pending/rejected applications surface
  // separately via DiscoverMyApplications, not as a browsable card here.
  const myActiveClubs = useMemo(() => {
    const seen = new Set<number>()
    const out: Club[] = []
    for (const c of [...(mine?.owned ?? []), ...(mine?.memberOf ?? [])]) {
      if (c.status !== 'APPROVED' || seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
    return out
  }, [mine])

  const clubs = useMemo(() => {
    // "My Clubs" must list the same set the badge counts — owned clubs were
    // missing here because only memberOf was read, so an owner saw a badge
    // of 3 with just their 1 memberOf club rendered underneath.
    if (activeTab === 'my') return myActiveClubs

    const list = catalog?.clubs?.length
      ? catalog.clubs
      : [...(recommended?.clubs ?? [])]
    const seen = new Set<number>()
    const out: Club[] = []
    for (const c of list) {
      if (seen.has(c.id)) continue
      // Already shown under "Your clubs" — don't repeat it in Recommended.
      if (myIds.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
    return out
  }, [catalog, recommended, activeTab, myIds, myActiveClubs])

  const clubsToDisplay = clubs.length > 0 ? clubs : []
  const gridClass =
    viewMode === 'grid' ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-col gap-2'

  return (
    <div className='flex h-full min-h-0 flex-col bg-muted'>
      <div className='shrink-0 border-b border-border bg-card'>
        <div className='flex items-center justify-between gap-3 px-4 py-3'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <Icons.sparkles className='size-8 shrink-0 text-primary' stroke={1.5} />
            <h2 className='truncate text-lg font-semibold tracking-tight text-foreground'>
              Discover
            </h2>
          </div>
          {isDean ? (
            <ClubCreateDialog
              isDean={isDean}
              isSuperAdmin={isSuperAdmin}
              label='Apply'
            />
          ) : null}
        </div>

        <div className='flex items-center gap-2 px-4 pb-3'>
          <div className='relative min-w-0 flex-1'>
            <Icons.search className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search clubs…'
              className='h-9 rounded-md border-0 bg-muted pl-8 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#3B82F6]/25'
            />
          </div>
          <div className='flex shrink-0 gap-0.5 rounded-md border border-border p-0.5'>
            <button
              type='button'
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded p-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              title='List view'
            >
              <List className='size-3.5' />
            </button>
            <button
              type='button'
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              title='Grid view'
            >
              <Grid3x3 className='size-3.5' />
            </button>
          </div>
        </div>

        <div className='flex gap-0 border-t border-border px-2'>
          <button
            type='button'
            onClick={() => setActiveTab('all')}
            className={cn(
              'relative px-3 py-2.5 text-sm font-semibold transition-colors',
              activeTab === 'all'
                ? 'text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('my')}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-colors',
              activeTab === 'my'
                ? 'text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Mine
            {myActiveClubs.length > 0 ? (
              <span className='flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white'>
                {myActiveClubs.length}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <ScrollArea className='min-h-0 flex-1 bg-muted'>
        <div className='space-y-4 p-3'>
          {isDean && activeTab === 'all' ? <DiscoverPendingApprovalsLink /> : null}
          {activeTab === 'all' ? (
            <DiscoverMyApplications clubs={myApplications} />
          ) : null}

          {activeTab === 'all' && myActiveClubs.length > 0 ? (
            <section className='space-y-2'>
              <h3 className='px-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground'>
                Your clubs
              </h3>
              <div className={gridClass}>
                {myActiveClubs.map((club) => (
                  <DiscoveryClubCard
                    key={club.id}
                    club={club}
                    isMember
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className='space-y-2'>
            {activeTab === 'all' ? (
              <h3 className='px-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground'>
                Recommended
              </h3>
            ) : null}

            {isLoading && clubsToDisplay.length === 0 ? (
              <div className={gridClass}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'animate-pulse rounded-xl border border-border bg-card',
                      viewMode === 'grid' ? 'h-16' : 'h-14'
                    )}
                  />
                ))}
              </div>
            ) : null}

            {!isLoading && clubsToDisplay.length === 0 ? (
              <div className='rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center'>
                <p className='text-sm font-medium text-muted-foreground'>No clubs to show yet.</p>
              </div>
            ) : (
              <div className={gridClass}>
                {clubsToDisplay.map((club) => (
                  <DiscoveryClubCard
                    key={club.id}
                    club={club}
                    isMember={myIds.has(club.id)}
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}
