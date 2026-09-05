'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  BookOpen,
  UsersRound,
  Megaphone,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Percent,
  CheckCircle2,
} from 'lucide-react'
import { useDeanReports } from '@/lib/dean/queries'
import { useRecentAnnouncements, useAnnouncementPublishedTotal } from '@/lib/announcements/queries'
import { useQueryClient } from '@/lib/async-query'
import { showToast } from '@/lib/notifications'
import { HeroMetricCard } from '@/components/overview/main-dashboard/hero-metric-card'
import { PlatformCountTile } from '@/components/overview/main-dashboard/platform-count-tile'
import { RetailStatCard } from '@/components/overview/main-dashboard/retail-stat-card'
import { MonthCalendar } from './month-calendar'
import { AnnouncementsSidebarCard } from './announcements-sidebar-card'

export function AdminDashboard({ user }: { user: { full_name?: string; role?: string } }) {
  const isDean = user?.role === 'DEAN'
  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin'
  const [welcomeCollapsed, setWelcomeCollapsed] = useState(false)

  const { data: reportsData, isLoading: reportsLoading, refetch, isFetching } = useDeanReports({
    period: '6m'
  })
  const { data: recentAnnouncements, isLoading: announcementsLoading, refetch: refetchAnnouncements } = useRecentAnnouncements(5)
  const { data: publishedTotal } = useAnnouncementPublishedTotal()
  const announcements = recentAnnouncements ?? []
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    void refetch()
    void refetchAnnouncements()
    queryClient.invalidateQueries({ queryKey: ['announcements'] })
    showToast('success', 'Dashboard refreshed')
  }

  // Map dean reports to DreamsPOS metric structure
  const totalCourses = reportsData?.kpis.totalCourses ?? 0
  const activeStudents = reportsData?.kpis.totalStudents ?? 0
  const totalLecturers = reportsData?.kpis.totalInstructors ?? 0
  const passRate = reportsData?.kpis.courseCompletionRate ?? 0
  const onTimeRate = reportsData?.kpis.onTimeRate ?? 0

  return (
    <div className='w-full space-y-3 pb-6'>
      {/* Welcome bar — DreamsPOS sales-dashboard "welcome" row */}
      <div className='flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <Image src='/assets/dashboard-icons/hi.svg' alt='' width={28} height={28} className='shrink-0' />
          {!welcomeCollapsed ? (
            <p className='text-sm text-muted-foreground'>
              <span className='font-bold text-foreground'>Hi{firstName ? `, ${firstName}` : ''},</span>{' '}
              here&apos;s what&apos;s happening across your faculty today.
            </p>
          ) : (
            <p className='text-sm font-bold text-foreground'>
              Hi{firstName ? `, ${firstName}` : ''}
            </p>
          )}
        </div>
        <div className='flex items-center gap-2 self-start sm:self-auto'>
          <button
            type='button'
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label='Refresh'
            className='flex size-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-50'
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            type='button'
            onClick={() => setWelcomeCollapsed((v) => !v)}
            aria-label={welcomeCollapsed ? 'Expand' : 'Collapse'}
            className='flex size-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted'
          >
            {welcomeCollapsed ? <ChevronDown className='size-3.5' /> : <ChevronUp className='size-3.5' />}
          </button>
        </div>
      </div>

      {/* Hero row: Hero metric + 2 tiles */}
      <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
        <HeroMetricCard
          label='Faculty Active Students'
          value={activeStudents.toLocaleString()}
          trend={12}
        />
        <div className='grid grid-cols-2 gap-3'>
          <PlatformCountTile
            icon={BookOpen}
            value={totalCourses.toLocaleString()}
            label='Total Courses'
            tone='blue'
          />
          <PlatformCountTile
            icon={UsersRound}
            value={totalLecturers.toLocaleString()}
            label='Lecturers'
            tone='lightGreen'
          />
        </div>
      </div>

      {/* Stat Cards row */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <RetailStatCard
          icon={Percent}
          label='Overall Pass Rate'
          value={`${passRate}%`}
          tone='sky'
          loading={reportsLoading}
        />
        <RetailStatCard
          icon={CheckCircle2}
          label='On-time submissions'
          value={`${onTimeRate}%`}
          tone='emerald'
          loading={reportsLoading}
        />
        <RetailStatCard
          icon={Megaphone}
          label='Active Announcements'
          value={(publishedTotal?.total ?? announcements.length).toString()}
          tone='violet'
          loading={reportsLoading}
        />
      </div>

      {/* Main Grid: Calendar & Shortcuts vs Latest Announcements */}
      <div className='grid grid-cols-1 gap-3 xl:grid-cols-12'>
        <div className='space-y-3 xl:col-span-7'>
          <MonthCalendar variant='featured' />
        </div>

        <div className='xl:col-span-5'>
          <AnnouncementsSidebarCard
            announcements={announcements}
            loading={announcementsLoading}
          />
        </div>
      </div>
    </div>
  )
}

