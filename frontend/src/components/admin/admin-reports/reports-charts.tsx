'use client';

import dynamic from 'next/dynamic';
import type { PlatformAnalytics } from '@/lib/admin/services';
import { Skeleton } from '@/features/ui/components/skeleton';

/**
 * recharts arrives in its own chunk, as on the main dashboard. This page
 * already shows skeletons while analytics load, so the chunk fetch hides
 * behind a wait that was happening anyway.
 */
const chartLoading = () => <Skeleton className='h-64 rounded-xl' />;

const ReportsGrowthCharts = dynamic(
  () => import('./reports-growth-charts').then((m) => m.ReportsGrowthCharts),
  { ssr: false, loading: chartLoading }
);
const ReportsPerformanceCharts = dynamic(
  () => import('./reports-performance-charts').then((m) => m.ReportsPerformanceCharts),
  { ssr: false, loading: chartLoading }
);

type Props = {
  data?: PlatformAnalytics;
  isLoading: boolean;
};

export function ReportsCharts({ data, isLoading }: Props) {
  if (isLoading && !data) {
    return (
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className='h-64 rounded-xl' />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
      <ReportsGrowthCharts data={data} />
      <ReportsPerformanceCharts data={data} />
    </div>
  );
}
