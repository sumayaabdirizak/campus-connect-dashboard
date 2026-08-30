'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck,
  Megaphone,
  Percent,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useAdminAnalytics } from '@/lib/admin/queries'
import { useDeanClubStats } from '@/lib/dean/queries'
import { useQueryClient } from '@/lib/async-query'
import { QueryErrorState } from '@/components/query-error-state'
import { SystemUsageChart } from '@/components/overview/main-dashboard/system-usage-chart'
import { showToast } from '@/lib/notifications'
import { buildMainDashboardKpiCards } from './main-dashboard-kpis'
import { PlatformCountTile } from './platform-count-tile'
import { HeroMetricCard } from './hero-metric-card'
import { MostActiveCoursesPanel } from './most-active-courses-panel'
import { RoleDistributionPanel } from './role-distribution-panel'
import { RecentLoginActivityPanel } from './recent-login-activity-panel'
import { RetailStatCard } from './retail-stat-card'
import type { AnalyticsPeriod } from './main-dashboard-period'

/** Super Admin home — DreamsPOS "Sales Dashboard" layout, mapped to platform data. */
export function MainDashboard() {
  const user = useAuthStore((s) => s.user)
  const firstName = user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0]
  const [period, setPeriod] = useState<AnalyticsPeriod>('6m')
  const [welcomeCollapsed, setWelcomeCollapsed] = useState(false)

  const {
    data: analytics,
    isLoading: analyticsLoading,
    isFetching,
    refetch,
    error,
  } = useAdminAnalytics({ period })
  const { data: clubStats } = useDeanClubStats()
  const queryClient = useQueryClient()

  const pendingTasks =
    (analytics?.charts.assignmentAnalytics?.pending ?? 0) + (clubStats?.pending ?? 0)

  const kpiCards = useMemo(
    () => buildMainDashboardKpiCards(analytics, pendingTasks),
    [analytics, pendingTasks]
  )
  const totalUsersCard = kpiCards.find((c) => c.key === 'users')
  const activeUsersCard = kpiCards.find((c) => c.key === 'active')

  const handleRefresh = () => {
    void refetch()
    queryClient.invalidateQueries({ queryKey: ['announcements'] })
    showToast('success', 'Dashboard refreshed')
  }

  return (
    <div className='w-full space-y-3 pb-6'>
      {/* Welcome bar — DreamsPOS sales-dashboard "welcome" row */}
      <div className='flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <Image src='/assets/dashboard-icons/hi.svg' alt='' width={28} height={28} className='shrink-0' />
          {!welcomeCollapsed ? (
            <p className='text-sm text-muted-foreground'>
              <span className='font-bold text-foreground'>Hi{firstName ? `, ${firstName}` : ''},</span>{' '}
              here&apos;s what&apos;s happening with your platform today.
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

      {error ? (
        <QueryErrorState
          title='Could not load dashboard analytics'
          message='Try refreshing the page.'
          onRetry={() => void refetch()}
        />
      ) : null}

      {/* sales-cards row: hero metric + 2 solid tiles */}
      <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
        <HeroMetricCard
          label='Total users'
          value={totalUsersCard?.value ?? '0'}
          trend={totalUsersCard?.trend}
        />
        <div className='grid grid-cols-2 gap-3'>
          <PlatformCountTile
            icon={UserCheck}
            value={activeUsersCard?.value ?? '0'}
            label='Active users'
            tone='blue'
          />
          <PlatformCountTile
            icon={Megaphone}
            value={(analytics?.platform.announcements ?? 0).toLocaleString()}
            label='Announcements'
            tone='lightGreen'
          />
        </div>
      </div>

      {/* Academic health — course completion, quiz pass rate, assignments submitted */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <RetailStatCard
          icon={Percent}
          label='Course completion rate'
          value={`${analytics?.kpis.completionRate ?? 0}%`}
          tone='sky'
          loading={analyticsLoading}
        />
        <RetailStatCard
          icon={CheckCircle2}
          label='Quiz pass rate'
          value={`${analytics?.kpis.quizPassRate ?? 0}%`}
          tone='emerald'
          loading={analyticsLoading}
        />
        <RetailStatCard
          icon={ClipboardList}
          label='Assignments submitted'
          value={(analytics?.kpis.assignmentsSubmitted ?? 0).toLocaleString()}
          tone='violet'
          loading={analyticsLoading}
        />
      </div>

      {/* Best Seller → Most Active Courses, Recent Transactions → Recent Login Activity */}
      <div className='grid grid-cols-1 gap-3 xl:grid-cols-12'>
        <div className='xl:col-span-4'>
          <MostActiveCoursesPanel data={analytics} loading={analyticsLoading} />
        </div>
        <div className='xl:col-span-8'>
          <RecentLoginActivityPanel />
        </div>
      </div>

      {/* Sales Analytics → System usage, Sales by Countries → Enrollment by department */}
      <div className='grid grid-cols-1 gap-3 xl:grid-cols-12'>
        <div className='xl:col-span-7'>
          {analytics ? (
            <SystemUsageChart data={analytics} tall period={period} onPeriodChange={setPeriod} />
          ) : null}
        </div>
        <div className='space-y-3 xl:col-span-5'>
          <RoleDistributionPanel data={analytics} loading={analyticsLoading} />
        </div>
      </div>
    </div>
  )
}
