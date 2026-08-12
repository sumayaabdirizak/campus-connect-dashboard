'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { useClubDetail, useJoinClub, useLeaveClub } from '@/lib/clubs/queries'
import { ClubPendingBanner } from '@/components/clubs/club-pending-banner'
import { ClubDetailBanner } from './club-detail-banner'
import { ClubDetailHeader } from './club-detail-header'
import { ClubDetailMain } from './club-detail-main'
import { ClubDetailSidebar } from './club-detail-sidebar'
import { ClubDetailLoading, ClubDetailNotFound } from './club-detail-states'
import { clubInitials, resolveClubRoleLabel } from './helpers'

export interface ClubDetailPaneProps {
  slug: string;
  /** Shows a compact strip on narrow (mobile) viewports — reserved for future layout use. */
  showMobileStrip: boolean;
}

export function ClubDetailPane({ slug }: ClubDetailPaneProps) {
  const { data, isLoading } = useClubDetail(slug)
  const joinMutation = useJoinClub()
  const leaveMutation = useLeaveClub()

  if (isLoading) return <ClubDetailLoading />
  if (!data?.club) return <ClubDetailNotFound />

  const { club, isMember, isOwner, membershipRole } = data
  const themeColor = club.themeColor || '#6366f1'
  const isPending = club.status === 'PENDING'
  const initials = clubInitials(club.name)
  const roleLabel = resolveClubRoleLabel(isOwner, membershipRole, isMember)

  return (
    <ScrollArea className='h-full'>
      <div
        className='min-h-full'
        style={{ '--club-accent': themeColor } as React.CSSProperties}
      >
        {isPending ? <ClubPendingBanner clubName={club.name} /> : null}
        <ClubDetailBanner
          bannerUrl={club.bannerUrl}
          themeColor={themeColor}
          initials={initials}
        />
        <ClubDetailHeader
          club={club}
          slug={slug}
          themeColor={themeColor}
          initials={initials}
          roleLabel={roleLabel}
          isMember={isMember}
          isOwner={isOwner}
          isPending={isPending}
          membershipRole={membershipRole}
          joining={joinMutation.isPending}
          leaving={leaveMutation.isPending}
          onJoin={() => joinMutation.mutate(club.id)}
          onLeave={() => leaveMutation.mutate(club.id)}
        />
        <div className='mx-auto flex max-w-5xl gap-6 px-4 py-6'>
          <ClubDetailMain
            club={club}
            themeColor={themeColor}
            isMember={isMember}
            isOwner={isOwner}
            joining={joinMutation.isPending}
            onJoin={() => joinMutation.mutate(club.id)}
          />
          <ClubDetailSidebar
            club={club}
            slug={slug}
            themeColor={themeColor}
            isMember={isMember}
            isOwner={isOwner}
            membershipRole={membershipRole}
          />
        </div>
      </div>
    </ScrollArea>
  )
}

export default ClubDetailPane
