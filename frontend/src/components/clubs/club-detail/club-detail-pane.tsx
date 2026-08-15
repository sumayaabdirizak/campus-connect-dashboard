'use client'

import { useEffect, useRef, useState } from 'react'
import { useClubDetail, useJoinClub, useLeaveClub } from '@/lib/clubs/queries'
import { ClubPendingBanner } from '@/components/clubs/club-pending-banner'
import { ClubDetailBanner } from './club-detail-banner'
import { ClubDetailHeader } from './club-detail-header'
import { ClubDetailMain } from './club-detail-main'
import { ClubDetailSidebar } from './club-detail-sidebar'
import { ClubDetailLoading, ClubDetailNotFound } from './club-detail-states'
import { clubInitials, resolveClubRoleLabel } from './helpers'

export interface ClubDetailPaneProps {
  slug: string
  showMobileStrip: boolean
}

export function ClubDetailPane({ slug }: ClubDetailPaneProps) {
  const { data, isLoading } = useClubDetail(slug)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const joinMutation = useJoinClub()
  const leaveMutation = useLeaveClub()

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleScroll = () => {
    // At most one evaluation per frame — scroll fires far more often than that.
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const y = scrollRef.current?.scrollTop ?? 0
      setIsCollapsed((prev) =>
        // Separate thresholds on purpose. Collapsing shortens the header, so
        // content slides up and scrollTop lands back below a single boundary —
        // which expands it, which pushes scrollTop over the boundary again.
        // The gap between 180 and 100 keeps the two states from chasing.
        prev ? y > 100 : y > 180
      )
    })
  }

  if (isLoading) return <ClubDetailLoading />
  if (!data?.club) return <ClubDetailNotFound />

  const { club, isMember, isOwner, membershipRole } = data
  const themeColor = club.themeColor || '#6366f1'
  const isPending = club.status === 'PENDING'
  const initials = clubInitials(club.name)
  const roleLabel = resolveClubRoleLabel(isOwner, membershipRole, isMember)

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className='h-full w-full overflow-y-auto bg-gray-50'
      style={{ '--club-accent': themeColor } as React.CSSProperties}
    >
      {isPending ? <ClubPendingBanner clubName={club.name} /> : null}

      <ClubDetailBanner
        bannerUrl={club.bannerUrl}
        themeColor={themeColor}
        initials={initials}
        clubName={club.name}
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
        isCollapsed={isCollapsed}
      />

      <div className='mx-auto flex max-w-5xl gap-6 px-4 py-6 min-h-screen'>
        {/* Main content — grows freely */}
        <ClubDetailMain
          club={club}
          themeColor={themeColor}
          isMember={isMember}
          isOwner={isOwner}
          joining={joinMutation.isPending}
          onJoin={() => joinMutation.mutate(club.id)}
        />

        {/*
          Sidebar — sticky top-4 self-start means:
          · It scrolls normally with the page until top=16px
          · Then it STICKS and stays visible for the rest of the scroll
          · self-start prevents the flex column from stretching it tall
        */}
        <div className='w-48 shrink-0 sticky top-4 self-start hidden lg:block'>
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
    </div>
  )
}

export default ClubDetailPane
