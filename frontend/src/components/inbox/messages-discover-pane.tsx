'use client'

import { useMemo, useState } from 'react'
import { Compass } from 'lucide-react'
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

/** Clubs discovery embedded in Messages right pane. */
export function MessagesDiscoverPane() {
  const [q, setQ] = useState('')
  const user = useAuthStore((s) => s.user)
  // AO manages clubs via nav admin, not Messages Discover (Discover is hidden for AO).
  const isSuperAdmin = isSuperAdminRole(user?.role)
  const isDean = isDeanRole(user?.role) || isSuperAdmin

  const { data: catalog, isLoading } = useClubs({
    q: q.trim() || undefined,
    sort: 'popular',
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

  const clubs = useMemo(() => {
    const list = catalog?.clubs?.length
      ? catalog.clubs
      : [...(recommended?.clubs ?? [])]
    const seen = new Set<number>()
    const out: Club[] = []
    for (const c of list) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
    return out
  }, [catalog, recommended])

  return (
    <div className='flex h-full min-h-0 flex-col bg-[#F8FAFC]'>
      <div className='flex shrink-0 items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <div className='flex size-9 items-center justify-center rounded-xl bg-[#EFF6FF]'>
            <Compass className='size-4 text-[#3B82F6]' />
          </div>
          <div>
            <h2 className='text-sm font-semibold text-[#101828]'>Discover clubs</h2>
            <p className='text-[11px] text-[#667085]'>Find communities to join</p>
          </div>
        </div>
        <ClubCreateDialog isDean={isDean} isSuperAdmin={isSuperAdmin} />
      </div>

      <div className='shrink-0 border-b border-[#E5E7EB] bg-white px-4 py-2.5'>
        <div className='relative'>
          <Icons.search className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#98A2B3]' />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search clubsâ€¦'
            className='h-9 border-[#E5E7EB] bg-[#F8FAFC] pl-8 text-sm'
          />
        </div>
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='space-y-4 p-4'>
          {isDean ? <DiscoverPendingApprovalsLink /> : null}
          <DiscoverMyApplications clubs={myApplications} />

          <div className='space-y-3'>
            <h3 className='text-xs font-semibold tracking-wide text-[#667085] uppercase'>
              Recommended for you
            </h3>

            {isLoading && clubs.length === 0 ? (
              <div className='grid gap-3 sm:grid-cols-2'>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className='h-28 animate-pulse rounded-xl border border-[#E5E7EB] bg-white'
                  />
                ))}
              </div>
            ) : null}

            {!isLoading && clubs.length === 0 ? (
              <div className='rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-10 text-center'>
                <p className='text-sm text-[#667085]'>No clubs to show yet.</p>
              </div>
            ) : (
              <div className='grid gap-3 sm:grid-cols-2'>
                {clubs.map((club) => (
                  <DiscoveryClubCard
                    key={club.id}
                    club={club}
                    isMember={myIds.has(club.id)}
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

