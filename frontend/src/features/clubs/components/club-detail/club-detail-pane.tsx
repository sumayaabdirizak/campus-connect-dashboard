'use client'

import { useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useClubDetail, useJoinClub, useLeaveClub } from '@/features/clubs/api/queries'
import { useAuthStore } from '@/lib/auth-store'
import { ClubPendingBanner } from '@/features/clubs/components/club-pending-banner'
import { ClubDetailBanner } from './club-detail-banner'
import { ClubDetailHeader } from './club-detail-header'
import { ClubDetailMain } from './club-detail-main'
import { ClubDetailSidebar } from './club-detail-sidebar'
import { ClubDetailLoading, ClubDetailNotFound } from './club-detail-states'
import { ClubInboxMobileStrip } from './club-inbox-mobile-strip'
import { clubInitials, formatClubDisplayName, resolveClubRoleLabel } from './helpers'

type Props = {
  slug: string
  /** Hide mobile club strip when Messages already shows Back. */
  showMobileStrip?: boolean
}

/** Club page body (banner, feed, sidebar) — no left inbox. */
export function ClubDetailPane({ slug, showMobileStrip = true }: Props) {
  const { data, isLoading } = useClubDetail(slug)
  const joinMutation = useJoinClub()
  const leaveMutation = useLeaveClub()
  const role = useAuthStore((s) => s.user?.role)
  const hideJoinActions = String(role || '').toUpperCase() === 'DEAN'

  const club = data?.club
  const displayName = club ? formatClubDisplayName(club.name) : ''

  useEffect(() => {
    if (!displayName) return
    const prev = document.title
    document.title = `${displayName} · Clubs · Campus Connect`
    return () => {
      document.title = prev
    }
  }, [displayName])

  if (isLoading) return <ClubDetailLoading />
  if (!club) return <ClubDetailNotFound />

  const { isMember, isOwner, membershipRole } = data
  const themeColor = club.themeColor || '#3B82F6'
  const clubAwaitingApproval = club.status === 'PENDING'
  const joinRequestPending = club.viewerJoinStatus === 'PENDING'
  const initials = clubInitials(club.name)
  const roleLabel = resolveClubRoleLabel(isOwner, membershipRole, isMember)

  return (
    <ScrollArea className='min-h-0 min-w-0 flex-1 bg-[#F8FAFC]'>
      <div style={{ '--club-accent': themeColor } as React.CSSProperties}>
        {showMobileStrip ? (
          <ClubInboxMobileStrip activeSlug={club.slug} />
        ) : null}
        {clubAwaitingApproval ? <ClubPendingBanner clubName={displayName} /> : null}
        <div className='relative'>
          <ClubDetailBanner
            bannerUrl={club.bannerUrl}
            themeColor={themeColor}
            initials={initials}
            displayName={displayName}
          />
          <ClubDetailHeader
            club={club}
            themeColor={themeColor}
            initials={initials}
            roleLabel={roleLabel}
            isMember={isMember}
            isOwner={isOwner}
            isPending={clubAwaitingApproval}
            joinRequestPending={joinRequestPending}
            membershipRole={membershipRole}
            joining={joinMutation.isPending}
            leaving={leaveMutation.isPending}
            onJoin={() => joinMutation.mutate(club.id)}
            onLeave={() => leaveMutation.mutate(club.id)}
            hideJoinActions={hideJoinActions}
          />
        </div>
        <div className='mx-auto grid max-w-5xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_240px]'>
          <ClubDetailMain
            club={club}
            themeColor={themeColor}
            isMember={isMember}
            isOwner={isOwner}
            joinRequestPending={joinRequestPending}
            joining={joinMutation.isPending}
            onJoin={() => joinMutation.mutate(club.id)}
            hideJoinActions={hideJoinActions}
          />
          <ClubDetailSidebar
            club={club}
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
