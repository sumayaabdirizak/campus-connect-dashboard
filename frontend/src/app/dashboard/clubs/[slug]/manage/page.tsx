'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Icons } from '@/components/icons'
import { useClubDetail, useClubJoinRequests } from '@/features/clubs/api/queries'
import { OverviewTab } from '@/features/clubs/components/manage/overview-tab'
import { RulesTab } from '@/features/clubs/components/manage/rules-tab'
import { MembersTab } from '@/features/clubs/components/manage/members-tab'
import { RequestsTab } from '@/features/clubs/components/manage/requests-tab'
import { InvitesTab } from '@/features/clubs/components/manage/invites-tab'
import { useAuthStore } from '@/lib/auth-store'

export default function ClubManagePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { data, isLoading } = useClubDetail(slug)
  const user = useAuthStore((s) => s.user)

  const club = data?.club
  const isOwner = data?.isOwner ?? false
  const isModerator = data?.membershipRole === 'ADMIN'
  const canManage = isOwner || isModerator

  // Pending request count for badge
  const { data: requestsData } = useClubJoinRequests(club?.id ?? null)
  const pendingCount = requestsData?.requests?.length ?? 0

  if (isLoading) {
    return (
      <div className='flex h-full flex-col'>
        <div className='border-b px-6 py-4'>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='mt-1 h-4 w-64' />
        </div>
        <div className='p-6 space-y-4'>
          <Skeleton className='h-32 w-full rounded-lg' />
          <Skeleton className='h-8 w-64' />
          <Skeleton className='h-8 w-full' />
        </div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3'>
        <Icons.alertCircle className='h-10 w-10 text-muted-foreground/50' />
        <h2 className='text-sm font-medium'>Club not found</h2>
        <Link href='/dashboard/clubs'>
          <Button size='sm' variant='outline'>Back to Clubs</Button>
        </Link>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3'>
        <Icons.alertCircle className='h-10 w-10 text-muted-foreground/50' />
        <h2 className='text-sm font-medium'>Access denied</h2>
        <p className='text-xs text-muted-foreground'>
          Only the club owner and moderators can manage this club.
        </p>
        <Link href={`/dashboard/clubs/${slug}`}>
          <Button size='sm' variant='outline'>Back to Club</Button>
        </Link>
      </div>
    )
  }

  const themeColor = club.themeColor || '#6366f1'

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b px-6 py-4'>
        <div className='flex items-center gap-3'>
          <Link href={`/dashboard/clubs/${slug}`}>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
              <Icons.chevronLeft className='h-4 w-4' />
            </Button>
          </Link>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-lg font-semibold'>Manage Club</h1>
              <Badge
                variant='outline'
                className='text-[10px]'
                style={{ borderColor: themeColor, color: themeColor }}
              >
                {isOwner ? 'Owner' : 'Moderator'}
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground'>{club.name}</p>
          </div>
        </div>

        {club.serverId && (
          <Link href={`/dashboard/chat/${club.serverId}`}>
            <Button size='sm' variant='outline' className='gap-1.5'>
              <Icons.chat className='h-3.5 w-3.5' />
              Open Chat
            </Button>
          </Link>
        )}
      </div>

      <ScrollArea className='flex-1'>
        <div className='mx-auto max-w-3xl p-6'>
          <Tabs defaultValue='overview'>
            <TabsList className='mb-6'>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='rules'>Rules</TabsTrigger>
              <TabsTrigger value='members'>Members</TabsTrigger>
              <TabsTrigger value='requests'>
                Requests
                {pendingCount > 0 && (
                  <Badge
                    variant='destructive'
                    className='ml-1.5 h-4 min-w-[16px] px-1 text-[10px]'
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='invites'>Invites</TabsTrigger>
            </TabsList>

            <TabsContent value='overview'>
              <OverviewTab club={club} isOwner={isOwner} />
            </TabsContent>

            <TabsContent value='rules'>
              <RulesTab club={club} />
            </TabsContent>

            <TabsContent value='members'>
              <MembersTab
                club={club}
                isOwner={isOwner}
                isModerator={isModerator}
              />
            </TabsContent>

            <TabsContent value='requests'>
              <RequestsTab club={club} />
            </TabsContent>

            <TabsContent value='invites'>
              <InvitesTab club={club} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}
