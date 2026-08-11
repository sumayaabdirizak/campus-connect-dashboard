import {
  BookOpen,
  GraduationCap,
  ListTodo,
  UserCheck,
  Users,
} from 'lucide-react'
import type { PlatformAnalytics, ReportKpiTone } from '@/lib/admin/services'

export type MainDashboardKpiCard = {
  key: string
  icon: typeof Users
  label: string
  value: string
  trend?: number
  hint: string
  tone: ReportKpiTone
}

/** Super Admin top KPIs — DreamsPOS diamond-icon cards, platform health + action queue. */
export function buildMainDashboardKpiCards(
  analytics: PlatformAnalytics | undefined,
  pendingTasks: number
): MainDashboardKpiCard[] {
  const kpis = analytics?.kpis
  const platform = analytics?.platform

  return [
    {
      key: 'users',
      icon: Users,
      label: 'Total users',
      value: (kpis?.totalUsers ?? 0).toLocaleString(),
      trend: kpis?.trends.totalUsers,
      hint: 'All roles',
      tone: 'sky',
    },
    {
      key: 'active',
      icon: UserCheck,
      label: 'Active users',
      value: (kpis?.activeUsers ?? 0).toLocaleString(),
      trend: kpis?.trends.activeUsers,
      hint: 'In reporting period',
      tone: 'emerald',
    },
    {
      key: 'students',
      icon: GraduationCap,
      label: 'Students',
      value: (platform?.students ?? 0).toLocaleString(),
      hint: 'Enrolled',
      tone: 'violet',
    },
    {
      key: 'teachers',
      icon: Users,
      label: 'Teachers',
      value: (platform?.teachers ?? 0).toLocaleString(),
      hint: 'Instructors',
      tone: 'indigo',
    },
    {
      key: 'courses',
      icon: BookOpen,
      label: 'Courses',
      value: (kpis?.totalCourses ?? platform?.offerings ?? 0).toLocaleString(),
      trend: kpis?.trends.totalCourses,
      hint: 'Catalogue',
      tone: 'amber',
    },
    {
      key: 'pending',
      icon: ListTodo,
      label: 'Pending work',
      value: pendingTasks.toLocaleString(),
      hint: pendingTasks > 0 ? 'Needs attention' : 'All clear',
      tone: 'rose',
    },
  ]
}
