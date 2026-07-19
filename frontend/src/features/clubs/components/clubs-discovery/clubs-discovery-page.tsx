'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClubCreateDialog } from '@/features/clubs/components/club-create-dialog'
import { useClubs, useJoinClub, useMyClubs } from '@/features/clubs/api/queries'
import { useAuthStore } from '@/lib/auth-store'
import type { Club } from '@/features/clubs/api/types'
import { ClubListRow } from './club-list-row'
import { DiscoveryToolbar, type SortMode, type TabMode } from './discovery-toolbar'
import { ListSkeleton } from './list-skeleton'

export function ClubsDiscoveryPage() {
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
          <DiscoveryToolbar
            tab={tab}
            sort={sort}
            search={search}
            myClubCount={myClubIds.size}
            onTabChange={setTab}
            onSortChange={setSort}
            onSearchChange={setSearch}
          />

          <div className='overflow-hidden rounded-xl border bg-card'>
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
                      You haven&apos;t joined any clubs yet
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

          {tab === 'all' && !search && (allClubs?.clubs?.length ?? 0) > 0 ? (
            <div className='mt-4 rounded-xl border bg-card p-4'>
              <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
                <Icons.sparkles className='h-3.5 w-3.5' />
                ABOUT COMMUNITIES
              </div>
              <p className='mt-2 text-xs leading-relaxed text-muted-foreground'>
                Clubs are student-run communities where you can discuss topics you care about, meet
                people with shared interests, and collaborate on projects. Join open clubs instantly
                or request access to private ones.
              </p>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )
}
