'use client';

import { useMemo } from 'react';
import Link from 'next/link';
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
import { showToast } from '@/lib/notifications';
import { exportDashboardSnapshot } from './export-dashboard-snapshot';
import { buildMainDashboardKpiCards } from './main-dashboard-kpis';
import { MainDashboardHeader } from './main-dashboard-header';

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

  const pendingTasks =
    (analytics?.charts.assignmentAnalytics?.pending ?? 0) + (clubStats?.pending ?? 0);

  const kpiCards = useMemo(
    () => buildMainDashboardKpiCards(analytics, pendingTasks),
    [analytics, pendingTasks]
  );

  const handleExport = () => {
    exportDashboardSnapshot(kpiCards.map(({ label, value }) => ({ label, value })));
    showToast('success', 'Dashboard snapshot exported');
  };

  const handleRefresh = () => {
    void refetch();
    showToast('success', 'Dashboard refreshed');
  };

  return (
    <div className='space-y-2 pb-8'>
      <MainDashboardHeader isFetching={isFetching} onRefresh={handleRefresh} onExport={handleExport} />

      {error ? (
        <QueryErrorState
          title='Could not load dashboard analytics'
          message='Try refreshing the page.'
          onRetry={() => void refetch()}
        />
      ) : null}

      <section aria-label='Key metrics'>
        {analyticsLoading ? (
          <DashboardKpiGridSkeleton />
        ) : (
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4'>
            {kpiCards.map((card) => (
              <DashboardKpiCard key={card.key} {...card} />
            ))}
          </div>
        )}
      </section>

      <section aria-label='Analytics charts'>
        <DashboardChartsSection data={analytics} loading={analyticsLoading} />
      </section>

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

      <div className='grid grid-cols-1 gap-2 xl:grid-cols-2'>
        <section className='rounded-xl border bg-card p-4 shadow-sm'>
          <div className='mb-3 flex items-center justify-between gap-2'>
            <h2 className='text-sm font-semibold'>Recent Users</h2>
            <Button variant='ghost' size='sm' asChild>
              <Link href='/dashboard/users'>View all</Link>
            </Button>
          </div>
          <DashboardRecentUsersTable users={usersData?.users ?? []} loading={usersLoading} />
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
