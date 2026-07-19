'use client';

import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportsGrowthCharts } from './reports-growth-charts';
import { ReportsPerformanceCharts } from './reports-performance-charts';

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
