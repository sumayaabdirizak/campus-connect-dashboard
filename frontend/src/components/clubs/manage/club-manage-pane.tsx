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

import { Crown } from 'lucide-react';

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

  const initials = club.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  const themeColor = club.themeColor || '#6366f1'

  return (
    <div className='flex h-full flex-col bg-[#F8FAFC]'>
      <div className='flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4'>
        <div className='flex items-center gap-3 min-w-0'>
          <Link
            href={messagesClubHref(slug)}
            className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-colors hover:bg-gray-50'
          >
            <Icons.chevronLeft className='h-4 w-4 text-gray-700' />
          </Link>

          <div
            className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden'
            style={{
              backgroundColor: `${themeColor}15`,
              color: themeColor,
            }}
          >
            {club.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.iconUrl} alt='' className='h-full w-full object-cover' />
            ) : (
              <span className='text-sm font-semibold'>{initials}</span>
            )}
          </div>

          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 className='text-lg font-bold leading-tight text-gray-900 truncate'>
                Manage · {club.name}
              </h1>
              {isOwner && (
                <div className='flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 shadow-sm'>
                  <Crown className='h-3 w-3' />
                  <span>Owner</span>
                </div>
              )}
            </div>
            <p className='text-xs text-gray-500 mt-0.5 leading-none'>
              Settings, members, and invites
            </p>
          </div>
        </div>

        <Link href={messagesClubHref(slug)}>
          <Button variant='outline' size='sm' className='font-semibold text-gray-700 hover:text-gray-900 border-gray-300 rounded-lg'>
            View group
          </Button>
        </Link>
      </div>

      <div className='flex-1 overflow-y-auto p-6'>
        <div className='mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm min-h-[500px] flex flex-col'>
          <Tabs defaultValue='overview' className='flex flex-1 flex-col overflow-hidden'>
            <div className='flex justify-center border-b border-gray-100 pb-4'>
              <TabsList className='bg-gray-100/80 p-1 rounded-full h-auto gap-1'>
                <TabsTrigger
                  value='overview'
                  className='rounded-full px-5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 transition-all'
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value='rules'
                  className='rounded-full px-5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 transition-all'
                >
                  Rules
                </TabsTrigger>
                <TabsTrigger
                  value='members'
                  className='rounded-full px-5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 transition-all'
                >
                  Members
                </TabsTrigger>
                {club.joinPolicy === 'BY_REQUEST' ? (
                  <TabsTrigger
                    value='requests'
                    className='rounded-full px-5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 transition-all'
                  >
                    Requests
                    {club.pendingRequestCount ? (
                      <span className='ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none'>
                        {club.pendingRequestCount}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>

            <div className='flex-1 overflow-y-auto pt-6'>
              <TabsContent value='overview' className='mt-0 focus-visible:outline-none'>
                <OverviewTab club={club} isOwner={isOwner} />
              </TabsContent>
              <TabsContent value='rules' className='mt-0 focus-visible:outline-none'>
                <RulesTab club={club} />
              </TabsContent>
              <TabsContent value='members' className='mt-0 focus-visible:outline-none'>
                <MembersTab club={club} isOwner={isOwner} isModerator={isModerator} />
              </TabsContent>
              {club.joinPolicy === 'BY_REQUEST' ? (
                <TabsContent value='requests' className='mt-0 focus-visible:outline-none'>
                  <RequestsTab club={club} />
                </TabsContent>
              ) : null}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default ClubManagePane
