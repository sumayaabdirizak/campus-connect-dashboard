'use client';

import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import { ChartCard, ChartSkeleton } from './dashboard-chart-shared';
import { DashboardGrowthCharts } from './dashboard-chart-panels-primary';
import { DashboardPerformanceCharts } from './dashboard-chart-panels-secondary';

export function DashboardChartsSection({
  data,
  loading,
}: {
  data?: PlatformAnalytics;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className='grid grid-cols-1 gap-2 lg:grid-cols-2'>
        {Array.from({ length: 5 }).map((_, i) => (
          <ChartCard key={i} title='Loading…'>
            <ChartSkeleton />
          </ChartCard>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className='grid grid-cols-1 gap-2 lg:grid-cols-2'>
      <DashboardGrowthCharts data={data} />
      <DashboardPerformanceCharts data={data} />
    </div>
  );
}
