'use client'

import type { ReactNode } from 'react'
import type { PlatformAnalytics } from '@/lib/admin'
import { ChartSkeleton } from './dashboard-chart-shared'
import { UserGrowthChart } from './dashboard-chart-panels-primary'
import { DashboardCourseEnrollmentChart } from './dashboard-course-enrollment-chart'
import { DashboardAssignmentPieChart } from './dashboard-assignment-pie-chart'
import { DashboardPerformanceCharts } from './dashboard-chart-panels-secondary'

/** Pharmacy-style: wide main chart + side panel, then secondary charts. */
export function DashboardChartsSection({
  data,
  loading,
  sidePanel,
  compact,
}: {
  data?: PlatformAnalytics
  loading?: boolean
  sidePanel?: ReactNode
  /** Minimal view: main chart + side panel only, no secondary chart row. */
  compact?: boolean
}) {
  if (loading) {
    return (
      <div className='space-y-3'>
        <div className='grid grid-cols-1 gap-3 xl:grid-cols-12'>
          <div className='rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm xl:col-span-8'>
            <ChartSkeleton />
          </div>
          <div className='rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm xl:col-span-4'>
            <ChartSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-1 items-stretch gap-3 xl:grid-cols-12'>
        <div className='xl:col-span-8'>
          <UserGrowthChart data={data} tall />
        </div>
        <div className='xl:col-span-4'>{sidePanel}</div>
      </div>

      {compact ? null : (
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3'>
          <DashboardCourseEnrollmentChart data={data} />
          <DashboardAssignmentPieChart data={data} />
          <DashboardPerformanceCharts data={data} />
        </div>
      )}
    </div>
  )
}
