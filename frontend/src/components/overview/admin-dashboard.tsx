'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  BookOpen,
  UsersRound,
  Megaphone,
  Bell,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Percent,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/features/ui/components/badge'
import { useDeanReports } from '@/lib/dean/queries'
import { useAnnouncements } from '@/lib/announcements/queries'
import { showToast } from '@/lib/notifications'
import { HeroMetricCard } from '@/components/overview/main-dashboard/hero-metric-card'
import { PlatformCountTile } from '@/components/overview/main-dashboard/platform-count-tile'
import { RetailStatCard } from '@/components/overview/main-dashboard/retail-stat-card'
import { MonthCalendar } from './month-calendar'

export function AdminDashboard({ user }: { user: { full_name?: string; role?: string } }) {
  const isDean = user?.role === 'DEAN'
  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin'
  const [welcomeCollapsed, setWelcomeCollapsed] = useState(false)

  const { data: reportsData, isLoading: reportsLoading, refetch, isFetching } = useDeanReports({
    period: '6m'
  })
  const { data: announcementsData } = useAnnouncements()
  const announcements = announcementsData ?? []

  const handleRefresh = () => {
    void refetch()
    showToast('success', 'Dashboard refreshed')
  }

  // Map dean reports to DreamsPOS metric structure
  const totalCourses = reportsData?.kpis.totalCourses ?? 0
  const activeStudents = reportsData?.kpis.totalStudents ?? 0
  const totalFaculty = reportsData?.kpis.totalInstructors ?? 0
  const passRate = reportsData?.kpis.courseCompletionRate ?? 0
  const attendanceRate = reportsData?.kpis.attendanceRate ?? 0

  return (
    <div className='w-full space-y-3 pb-6'>
      {/* Welcome bar — DreamsPOS sales-dashboard "welcome" row */}
      <div className='flex w-full flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <Image src='/assets/dashboard-icons/hi.svg' alt='' width={28} height={28} className='shrink-0' />
          {!welcomeCollapsed ? (
            <p className='text-sm text-[#667085]'>
              <span className='font-bold text-[#101828]'>Hi{firstName ? `, ${firstName}` : ''},</span>{' '}
              here&apos;s what&apos;s happening across your faculty today.
            </p>
          ) : (
            <p className='text-sm font-bold text-[#101828]'>
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
            className='flex size-8 items-center justify-center rounded-full border border-[#E5E7EB] text-[#344054] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50'
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            type='button'
            onClick={() => setWelcomeCollapsed((v) => !v)}
            aria-label={welcomeCollapsed ? 'Expand' : 'Collapse'}
            className='flex size-8 items-center justify-center rounded-full border border-[#E5E7EB] text-[#344054] transition-colors hover:bg-[#F8FAFC]'
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
            value={totalFaculty.toLocaleString()}
            label='Faculty Members'
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
          label='Attendance Rate'
          value={`${attendanceRate}%`}
          tone='emerald'
          loading={reportsLoading}
        />
        <RetailStatCard
          icon={Megaphone}
          label='Active Announcements'
          value={announcements.length.toString()}
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
          <div className='h-full rounded-2xl border border-[#E5E7EB] bg-white shadow-sm'>
            <div className='flex items-center gap-2 border-b border-[#F2F4F7] px-4 py-3.5'>
              <Bell className='size-4 text-[#667085]' />
              <h2 className='text-sm font-bold text-[#101828]'>Latest Announcements</h2>
            </div>
            <div className='px-4 py-2'>
              {announcements.length > 0 ? (
                <ul className='divide-y divide-[#F2F4F7]'>
                  {announcements.slice(0, 5).map((a: { id: string | number; title: string }) => (
                    <li key={a.id}>
                      <Link
                        href='/dashboard/announcements'
                        className='flex items-start gap-2 py-3 transition-colors hover:bg-[#F8FAFC]'
                      >
                        <Badge
                          variant='secondary'
                          className='mt-0.5 shrink-0 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8] uppercase ring-1 ring-[#BFDBFE]'
                        >
                          New
                        </Badge>
                        <span className='line-clamp-2 text-sm font-medium text-[#101828] hover:underline'>
                          {a.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='py-6 text-center text-sm text-[#667085]'>No announcements.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

