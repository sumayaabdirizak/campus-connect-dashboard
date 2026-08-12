'use client'

import Link from 'next/link'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClubDetail } from '@/lib/clubs/queries'
import { messagesClubHref } from '@/lib/inbox/services/messages-href'
import { OverviewTab } from './overview-tab'
import { MembersTab } from './members-tab'
import { RequestsTab } from './requests-tab'
import { RulesTab } from './rules-tab'
import { InvitesTab } from './invites-tab'

export interface ClubManagePaneProps {
  slug: string;
}

export function ClubManagePane({ slug }: ClubManagePaneProps) {
  const { data, isLoading } = useClubDetail(slug)

  if (isLoading) {
    return (
      <div className='space-y-4 p-6'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 w-full rounded-xl' />
      </div>
    )
  }

  if (!data?.club) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3'>
        <Icons.alertCircle className='h-10 w-10 text-muted-foreground/50' />
        <h2 className='text-sm font-medium'>Club not found</h2>
      </div>
    )
  }

  const { club, isOwner, membershipRole } = data
  const isModerator = membershipRole === 'ADMIN'

  if (!isOwner && !isModerator) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3 p-6 text-center'>
        <Icons.lock className='h-10 w-10 text-muted-foreground/50' />
        <h2 className='text-sm font-medium'>You don&apos;t have permission to manage this club</h2>
        <Link href={messagesClubHref(slug)}>
          <Button size='sm' variant='outline'>
            Back to Club
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between border-b px-6 py-4'>
        <div className='flex items-center gap-3'>
          <Link
            href={messagesClubHref(slug)}
            className='flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted'
          >
            <Icons.chevronLeft className='h-4 w-4' />
          </Link>
          <div>
            <h1 className='text-lg font-semibold leading-tight'>Manage {club.name}</h1>
            <p className='text-xs text-muted-foreground'>
              {club.memberCountCache} member{club.memberCountCache !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue='overview' className='flex flex-1 flex-col overflow-hidden'>
        <TabsList className='mx-6 mt-4 w-fit'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='members'>Members</TabsTrigger>
          {club.joinPolicy === 'BY_REQUEST' ? (
            <TabsTrigger value='requests'>
              Requests
              {club.pendingRequestCount ? (
                <span className='ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white'>
                  {club.pendingRequestCount}
                </span>
              ) : null}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value='invites'>Invites</TabsTrigger>
          <TabsTrigger value='rules'>Rules</TabsTrigger>
        </TabsList>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <TabsContent value='overview' className='mt-0'>
            <OverviewTab club={club} isOwner={isOwner} />
          </TabsContent>
          <TabsContent value='members' className='mt-0'>
            <MembersTab club={club} isOwner={isOwner} isModerator={isModerator} />
          </TabsContent>
          {club.joinPolicy === 'BY_REQUEST' ? (
            <TabsContent value='requests' className='mt-0'>
              <RequestsTab club={club} />
            </TabsContent>
          ) : null}
          <TabsContent value='invites' className='mt-0'>
            <InvitesTab club={club} />
          </TabsContent>
          <TabsContent value='rules' className='mt-0'>
            <RulesTab club={club} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default ClubManagePane
