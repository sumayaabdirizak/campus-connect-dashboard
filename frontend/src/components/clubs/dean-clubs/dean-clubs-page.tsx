'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePendingClubs } from '@/lib/clubs/queries'
import { isDeanRole, isSuperAdminRole } from '@shared/roles'
import { useAuthStore } from '@/lib/auth-store'
import { ClubCreateDialog } from '@/components/clubs/club-create-dialog'
import { AllClubsTab } from './all-clubs-tab'
import { PendingTab } from './pending-tab'

const STATUS_FILTERS = ['APPROVED', 'SUSPENDED', 'REJECTED'] as const

export function DeanClubsPage() {
  const [tab, setTab] = useState('all')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const { data: pendingData } = usePendingClubs()
  const pendingCount = pendingData?.clubs?.length ?? 0
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = isSuperAdminRole(user?.role)
  const isDean = isDeanRole(user?.role) || isSuperAdmin

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-muted p-2 sm:p-3'>
      <div className='mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden'>
        <Tabs
          value={tab}
          onValueChange={setTab}
          className='flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm'
        >
          <header className='shrink-0 border-b border-border/60 bg-background/95 px-3 backdrop-blur-sm'>
            <div className='flex items-center gap-1.5 py-1.5'>
              <ClubCreateDialog isDean={isDean} isSuperAdmin={isSuperAdmin} label='Create Club' />
              <TabsList
                className='h-auto shrink-0 gap-0.5 rounded-full border border-border bg-muted/50 p-0.5 shadow-xs'
              >
                <TabsTrigger
                  value='pending'
                  className='group h-7 rounded-full px-2.5 text-[11px] font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'
                >
                  Pending
                  {pendingCount > 0 ? (
                    <span
                      className='ms-1 rounded-full bg-primary px-1.5 py-0 text-[9px] font-bold text-primary-foreground group-data-[state=active]:bg-primary-foreground/25'
                    >
                      {pendingCount}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger
                  value='all'
                  className='h-7 rounded-full px-2.5 text-[11px] font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'
                >
                  All Clubs
                </TabsTrigger>
              </TabsList>

              {tab === 'all' ? (
                <div
                  className='flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                >
                  <button
                    type='button'
                    onClick={() => setStatusFilter(undefined)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      !statusFilter
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    All
                  </button>
                  {STATUS_FILTERS.map((s) => (
                    <button
                      key={s}
                      type='button'
                      onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        statusFilter === s
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              ) : pendingCount > 0 ? (
                <Badge variant='secondary' className='ms-auto shrink-0 text-[10px]'>
                  {pendingCount} pending
                </Badge>
              ) : null}
            </div>
          </header>

          <TabsContent
            value='pending'
            className='mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden'
          >
            <PendingTab />
          </TabsContent>

          <TabsContent
            value='all'
            className='mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden'
          >
            <AllClubsTab statusFilter={statusFilter} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default DeanClubsPage
