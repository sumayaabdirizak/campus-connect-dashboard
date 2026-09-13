'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import type { PlatformAnalytics } from '@/lib/admin'
import { ChartSkeleton } from './dashboard-chart-shared'

/**
 * Charts arrive in their own chunk.
 *
 * recharts is a large dependency and this is the page everyone lands on after
 * signing in, so it was on the critical path for every session. The section
 * already renders `ChartSkeleton` while analytics load, which makes the swap
 * invisible: the same skeleton now covers the chunk fetch as well, and the
 * charts cannot paint before their data arrives anyway.
 *
 * `ssr: false` — these render from client-side query data and read layout
 * dimensions, so there is nothing to gain from rendering them on the server.
 */
const chartLoading = () => <ChartSkeleton />

const UserGrowthChart = dynamic(
  () => import('./dashboard-chart-panels-primary').then((m) => m.UserGrowthChart),
  { ssr: false, loading: chartLoading }
)
const DashboardCourseEnrollmentChart = dynamic(
  () => import('./dashboard-course-enrollment-chart').then((m) => m.DashboardCourseEnrollmentChart),
  { ssr: false, loading: chartLoading }
)
const DashboardAssignmentPieChart = dynamic(
  () => import('./dashboard-assignment-pie-chart').then((m) => m.DashboardAssignmentPieChart),
  { ssr: false, loading: chartLoading }
)
const DashboardPerformanceCharts = dynamic(
  () => import('./dashboard-chart-panels-secondary').then((m) => m.DashboardPerformanceCharts),
  { ssr: false, loading: chartLoading }
)

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
          <div className='rounded-xl border border-border bg-card p-4 xl:col-span-8'>
            <ChartSkeleton />
          </div>
          <div className='rounded-xl border border-border bg-card p-4 xl:col-span-4'>
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
