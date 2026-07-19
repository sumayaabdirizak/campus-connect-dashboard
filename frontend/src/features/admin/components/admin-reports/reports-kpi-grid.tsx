'use client'

import {
  Activity,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LineChart,
  PieChart,
  Users,
} from 'lucide-react'
import type { PlatformAnalytics } from '@/features/admin/api/admin-api'
import { KpiCard } from './report-cards'

type Props = {
  data?: PlatformAnalytics
  isLoading: boolean
}

export function ReportsKpiGrid({ data, isLoading }: Props) {
  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7'>
      <KpiCard
        icon={Users}
        label='Total users'
        value={(data?.kpis.totalUsers ?? 0).toLocaleString()}
        hint='Registered accounts'
        trend={data?.kpis.trends.totalUsers}
        loading={isLoading}
      />
      <KpiCard
        icon={Activity}
        label='Active users'
        value={(data?.kpis.activeUsersThisMonth ?? 0).toLocaleString()}
        hint='Active this month'
        trend={data?.kpis.trends.activeUsers}
        loading={isLoading}
      />
      <KpiCard
        icon={BookOpen}
        label='Total courses'
        value={data?.kpis.totalCourses ?? 0}
        hint='Published offerings'
        trend={data?.kpis.trends.totalCourses}
        loading={isLoading}
      />
      <KpiCard
        icon={ClipboardList}
        label='Submissions'
        value={(data?.kpis.assignmentsSubmitted ?? 0).toLocaleString()}
        hint='Assignment submissions'
        trend={data?.kpis.trends.assignmentsSubmitted}
        loading={isLoading}
      />
      <KpiCard
        icon={GraduationCap}
        label='Quiz attempts'
        value={(data?.kpis.quizAttempts ?? 0).toLocaleString()}
        hint='Total attempts'
        trend={data?.kpis.trends.quizAttempts}
        loading={isLoading}
      />
      <KpiCard
        icon={PieChart}
        label='Completion rate'
        value={`${data?.kpis.completionRate ?? 0}%`}
        hint='Average quiz score'
        trend={data?.kpis.trends.completionRate}
        loading={isLoading}
      />
      <KpiCard
        icon={LineChart}
        label='System usage'
        value={(data?.kpis.dailyActiveSessions ?? 0).toLocaleString()}
        hint='Sessions (14d messages)'
        trend={data?.kpis.trends.dailyActiveSessions}
        loading={isLoading}
      />
    </div>
  )
}
