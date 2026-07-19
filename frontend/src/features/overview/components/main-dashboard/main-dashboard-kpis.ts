import {
  Activity,
  BookOpen,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Users,
} from 'lucide-react';
import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import type { DashboardKpiCardProps } from './dashboard-kpi-card';

export function buildMainDashboardKpiCards(
  analytics: PlatformAnalytics | undefined,
  pendingTasks: number
): (DashboardKpiCardProps & { key: string })[] {
  const kpis = analytics?.kpis;
  const platform = analytics?.platform;

  return [
    {
      key: 'users',
      icon: Users,
      label: 'Total Users',
      value: (kpis?.totalUsers ?? 0).toLocaleString(),
      description: 'Registered accounts across the platform',
      trend: kpis?.trends.totalUsers,
      status: (kpis?.trends.totalUsers ?? 0) >= 0 ? 'positive' : 'negative',
      tone: 'indigo',
    },
    {
      key: 'courses',
      icon: BookOpen,
      label: 'Total Courses',
      value: (kpis?.totalCourses ?? platform?.offerings ?? 0).toLocaleString(),
      description: 'Unique courses in the catalogue',
      trend: kpis?.trends.totalCourses,
      status: 'neutral',
      tone: 'sky',
    },
    {
      key: 'students',
      icon: GraduationCap,
      label: 'Total Students',
      value: (platform?.students ?? 0).toLocaleString(),
      description: 'Active student enrollments',
      trend: kpis?.trends.activeUsers,
      status: 'positive',
      tone: 'emerald',
    },
    {
      key: 'instructors',
      icon: Users,
      label: 'Total Instructors',
      value: (platform?.teachers ?? 0).toLocaleString(),
      description: 'Teachers and faculty staff',
      status: 'neutral',
      tone: 'violet',
    },
    {
      key: 'assignments',
      icon: ClipboardList,
      label: 'Assignments',
      value: (kpis?.assignmentsSubmitted ?? 0).toLocaleString(),
      description: 'Total submissions recorded',
      trend: kpis?.trends.assignmentsSubmitted,
      status: 'positive',
      tone: 'orange',
    },
    {
      key: 'quizzes',
      icon: FileQuestion,
      label: 'Quizzes',
      value: (kpis?.quizAttempts ?? 0).toLocaleString(),
      description: 'Quiz attempts across all courses',
      trend: kpis?.trends.quizAttempts,
      status: 'neutral',
      tone: 'amber',
    },
    {
      key: 'pending',
      icon: ClipboardList,
      label: 'Pending Tasks',
      value: pendingTasks.toLocaleString(),
      description: 'Pending assignments & club approvals',
      status: pendingTasks > 0 ? 'warning' : 'positive',
      tone: 'rose',
    },
    {
      key: 'sessions',
      icon: Activity,
      label: 'Active Sessions',
      value: (kpis?.dailyActiveSessions ?? 0).toLocaleString(),
      description: 'Platform activity in the last 14 days',
      trend: kpis?.trends.dailyActiveSessions,
      status: 'positive',
      tone: 'cyan',
    },
  ];
}
