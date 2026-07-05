'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  BookOpen,
  ClipboardList,
  Download,
  FileQuestion,
  GraduationCap,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useAdminAnalytics } from '@/features/admin/api/queries';
import { useDeanClubStats } from '@/features/dean/api/queries';
import { useUsers } from '@/features/users/api/queries';
import { DashboardActivityTimeline } from '@/features/overview/components/main-dashboard/dashboard-activity-timeline';
import { QueryErrorState } from '@/components/query-error-state';
import { DashboardChartsSection } from '@/features/overview/components/main-dashboard/dashboard-charts-section';
import {
  DashboardRecentCoursesTable,
  DashboardRecentUsersTable,
} from '@/features/overview/components/main-dashboard/dashboard-data-tables';
import {
  DashboardKpiCard,
  DashboardKpiGridSkeleton,
} from '@/features/overview/components/main-dashboard/dashboard-kpi-card';
import { DashboardQuickActions } from '@/features/overview/components/main-dashboard/dashboard-quick-actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/lib/notifications';
import type { DashboardKpiCardProps } from '@/features/overview/components/main-dashboard/dashboard-kpi-card';

function exportDashboardSnapshot(
  kpis: { label: string; value: string | number }[]
) {
  const header = 'Metric,Value';
  const rows = kpis.map((k) => `"${k.label}","${k.value}"`);
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-snapshot-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MainDashboard() {
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isFetching,
    refetch,
    error,
  } = useAdminAnalytics({ period: '6m' });
  const { data: clubStats } = useDeanClubStats();
  const { data: usersData, isLoading: usersLoading } = useUsers({ page: 1, limit: 8 });

  const kpis = analytics?.kpis;
  const platform = analytics?.platform;
  const pendingTasks =
    (analytics?.charts.assignmentAnalytics?.pending ?? 0) + (clubStats?.pending ?? 0);

  const kpiCards: (DashboardKpiCardProps & { key: string })[] = useMemo(
    () => [
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
    ],
    [kpis, platform, pendingTasks]
  );

  const handleExport = () => {
    exportDashboardSnapshot(
      kpiCards.map(({ label, value }) => ({ label, value }))
    );
    showToast('success', 'Dashboard snapshot exported');
  };

  const handleRefresh = () => {
    void refetch();
    showToast('success', 'Dashboard refreshed');
  };

  return (
    <div className='space-y-2 pb-8'>
      {/* Sticky header */}
      <div className='bg-background/95 sticky top-0 z-20 -mx-4 border-b px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
            <p className='text-muted-foreground mt-1 text-sm'>
              Welcome back. Here is what is happening in your platform today.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button type='button' variant='outline' size='sm' onClick={handleExport}>
              <Download className='mr-1.5 size-3.5' />
              Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type='button' size='sm'>
                  <Plus className='mr-1.5 size-3.5' />
                  Add New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-52'>
                <DropdownMenuLabel>Create</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/dashboard/dean/courses'>Course</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href='/dashboard/users'>Student account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href='/dashboard/users'>Instructor account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href='/dashboard/dean/Assigning'>Assignment / Quiz</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href='/dashboard/announcements'>Announcement</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {error ? (
        <QueryErrorState
          title='Could not load dashboard analytics'
          message='Try refreshing the page.'
          onRetry={() => void refetch()}
        />
      ) : null}

      {/* KPI cards */}
      <section aria-label='Key metrics'>
        {analyticsLoading ? (
          <DashboardKpiGridSkeleton />
        ) : (
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4'>
            {kpiCards.map((card) => (
              <DashboardKpiCard
                key={card.key}
                icon={card.icon}
                label={card.label}
                value={card.value}
                description={card.description}
                trend={card.trend}
                status={card.status}
                tone={card.tone}
              />
            ))}
          </div>
        )}
      </section>

      {/* Charts */}
      <section aria-label='Analytics charts'>
        <DashboardChartsSection data={analytics} loading={analyticsLoading} />
      </section>

      {/* Activity + Quick actions */}
      <div className='grid grid-cols-1 gap-2 xl:grid-cols-12'>
        <section
          aria-label='Recent activity'
          className='rounded-xl border bg-card p-4 shadow-sm xl:col-span-5'
        >
          <h2 className='mb-4 text-sm font-semibold'>Recent Activity</h2>
          <DashboardActivityTimeline
            items={analytics?.recentActivity ?? []}
            loading={analyticsLoading}
          />
        </section>

        <section aria-label='Quick actions' className='xl:col-span-7'>
          <h2 className='mb-2 text-sm font-semibold'>Quick Actions</h2>
          <DashboardQuickActions />
        </section>
      </div>

      {/* Tables */}
      <div className='grid grid-cols-1 gap-2 xl:grid-cols-2'>
        <section className='rounded-xl border bg-card p-4 shadow-sm'>
          <div className='mb-3 flex items-center justify-between gap-2'>
            <h2 className='text-sm font-semibold'>Recent Users</h2>
            <Button variant='ghost' size='sm' asChild>
              <Link href='/dashboard/users'>View all</Link>
            </Button>
          </div>
          <DashboardRecentUsersTable
            users={usersData?.users ?? []}
            loading={usersLoading}
          />
        </section>

        <section className='rounded-xl border bg-card p-4 shadow-sm'>
          <div className='mb-3 flex items-center justify-between gap-2'>
            <h2 className='text-sm font-semibold'>Recent Courses</h2>
            <Button variant='ghost' size='sm' asChild>
              <Link href='/dashboard/admin/report'>View reports</Link>
            </Button>
          </div>
          <DashboardRecentCoursesTable data={analytics} loading={analyticsLoading} />
        </section>
      </div>
    </div>
  );
}
