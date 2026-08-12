'use client'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePendingClubs } from '@/lib/clubs/queries'
import { AllClubsTab } from './all-clubs-tab'
import { PendingTab } from './pending-tab'

export function DeanClubsPage() {
  const { data: pendingData } = usePendingClubs()
  const pendingCount = pendingData?.clubs?.length ?? 0

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between border-b px-6 py-4'>
        <div>
          <h1 className='text-xl font-semibold'>Club Management</h1>
          <p className='text-sm text-muted-foreground'>
            Review applications and manage faculty clubs
          </p>
        </div>
        {pendingCount > 0 ? (
          <Badge variant='secondary'>{pendingCount} pending</Badge>
        ) : null}
      </div>

      <Tabs defaultValue='pending' className='flex flex-1 flex-col overflow-hidden'>
        <TabsList className='mx-6 mt-4 w-fit'>
          <TabsTrigger value='pending'>
            Pending
            {pendingCount > 0 ? (
              <span className='ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white'>
                {pendingCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value='all'>All Clubs</TabsTrigger>
        </TabsList>

        <TabsContent value='pending' className='flex flex-1 flex-col overflow-hidden mt-0'>
          <PendingTab />
        </TabsContent>

        <TabsContent value='all' className='flex flex-1 flex-col overflow-hidden mt-0'>
          <AllClubsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DeanClubsPage
