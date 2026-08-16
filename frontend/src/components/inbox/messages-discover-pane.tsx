'use client'

import { useMemo, useState } from 'react'
import { List, Grid3x3 } from 'lucide-react'
import { Input } from '@/features/ui/components/input'
import { ScrollArea } from '@/features/ui/components/scroll-area'
import { Icons } from '@/components/icons'
import {
  useClubs,
  useMyClubs,
  useRecommendedClubs
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
  const [sortBy, setSortBy] = useState<'popular' | 'new' | 'active'>('popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const user = useAuthStore((s) => s.user)
  // AO manages clubs via nav admin, not Messages Discover (Discover is hidden for AO).
  const isSuperAdmin = isSuperAdminRole(user?.role)
  const isDean = isDeanRole(user?.role) || isSuperAdmin

  const { data: catalog, isLoading } = useClubs({
    q: q.trim() || undefined,
    sort: sortBy,
    limit: 30
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

    const list = catalog?.clubs?.length ? catalog.clubs : [...(recommended?.clubs ?? [])]
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

  const clubsToDisplay = useMemo(() => {
    return clubs.length > 0 ? clubs : []
  }, [clubs])

  const totalToExplore = clubsToDisplay.length + (activeTab === 'all' ? myActiveClubs.length : 0)

  return (
    <div className='flex h-full min-h-0 flex-col bg-[#F9FAFB]'>
      <div className='shrink-0 border-b border-[#E5E7EB] bg-white'>
        <div className='px-4 py-4'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF]'>
                <Icons.sparkles className='size-4 text-[#6366F1]' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-[#101828]'>Discover</h2>
                <p className='text-xs text-[#667085]'>{totalToExplore} clubs to explore</p>
              </div>
            </div>
            <ClubCreateDialog isDean={isDean} isSuperAdmin={isSuperAdmin} label='Apply for Club' />
          </div>

          <div className='mb-3 flex items-center justify-between gap-2'>
            <div className='flex gap-2'>
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                  activeTab === 'all'
                    ? 'bg-[#F3F4F6] text-[#101828] border border-[#D1D5DB]'
                    : 'text-[#667085] hover:text-[#101828]'
                )}
              >
                All Clubs
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all',
                  activeTab === 'my'
                    ? 'bg-[#F3F4F6] text-[#101828] border border-[#D1D5DB]'
                    : 'text-[#667085] hover:text-[#101828]'
                )}
              >
                My Clubs
                {myActiveClubs.length > 0 ? (
                  <span className='flex size-4 items-center justify-center rounded-full bg-[#3B82F6] text-[10px] font-semibold text-white'>
                    {myActiveClubs.length}
                  </span>
                ) : null}
              </button>
            </div>

            <div className='flex gap-1 border border-[#E5E7EB] rounded-lg p-1'>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded transition-all',
                  viewMode === 'list'
                    ? 'bg-[#F3F4F6]'
                    : 'hover:bg-[#F9FAFB]'
                )}
                title='List view'
              >
                <List className='h-4 w-4 text-[#667085]' />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded transition-all',
                  viewMode === 'grid'
                    ? 'bg-[#F3F4F6]'
                    : 'hover:bg-[#F9FAFB]'
                )}
                title='Grid view'
              >
                <Grid3x3 className='h-4 w-4 text-[#667085]' />
              </button>
            </div>
          </div>
        </div>

        <div className='px-4 py-3 border-t border-[#E5E7EB]'>
          <div className='flex items-center gap-2'>
            <div className='relative flex-1'>
              <Icons.search className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#98A2B3]' />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search clubs...'
                className='h-9 rounded-full border-[#E5E7EB] bg-[#F8FAFC] pl-8 text-sm'
              />
            </div>

            <div className='flex shrink-0 gap-1.5'>
              <button
                onClick={() => setSortBy('popular')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  sortBy === 'popular'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#F3F4F6] text-[#667085] hover:bg-[#E5E7EB]'
                )}
              >
                Popular
              </button>
              <button
                onClick={() => setSortBy('new')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  sortBy === 'new'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#F3F4F6] text-[#667085] hover:bg-[#E5E7EB]'
                )}
              >
                New
              </button>
              <button
                onClick={() => setSortBy('active')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  sortBy === 'active'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#F3F4F6] text-[#667085] hover:bg-[#E5E7EB]'
                )}
              >
                Active
              </button>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='space-y-5 p-4'>
          {isDean && activeTab === 'all' ? <DiscoverPendingApprovalsLink /> : null}
          {activeTab === 'all' ? <DiscoverMyApplications clubs={myApplications} /> : null}

          {activeTab === 'all' && myActiveClubs.length > 0 ? (
            <div className='space-y-3'>
              <h3 className='text-sm font-bold text-[#101828]'>Your clubs</h3>
              <div className={cn(viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3')}>
                {myActiveClubs.map((club) => (
                  <DiscoveryClubCard
                    key={club.id}
                    club={club}
                    isMember
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className='space-y-3'>
            {activeTab === 'all' && (
              <h3 className='text-sm font-bold text-[#101828]'>Recommended for you</h3>
            )}

            {isLoading && clubsToDisplay.length === 0 ? (
              <div className={cn(
                viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'
              )}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'animate-pulse rounded-xl border border-[#E5E7EB] bg-white',
                      viewMode === 'grid' ? 'h-28' : 'h-16'
                    )}
                  />
                ))}
              </div>
            ) : null}

            {!isLoading && clubsToDisplay.length === 0 ? (
              <div className='rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-10 text-center'>
                <p className='text-sm text-[#667085]'>No clubs to show yet.</p>
              </div>
            ) : (
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid gap-3 sm:grid-cols-2'
                  : 'space-y-3'
              )}>
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
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

