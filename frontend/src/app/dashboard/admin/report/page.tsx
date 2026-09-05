'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useAdminAnalytics, useAdminFaculties } from '@/lib/admin/queries';
import type { AdminReportFilterState } from '@/components/admin/admin-report-filters';
import { Skeleton } from '@/features/ui/components/skeleton';

const AdminReportsDashboard = dynamic(
  () =>
    import('@/components/admin/admin-reports/admin-reports-dashboard').then(
      (m) => m.AdminReportsDashboard
    ),
  {
    ssr: false,
    loading: () => (
      <div className='space-y-4'>
        <Skeleton className='h-24 rounded-xl' />
        <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className='h-24 rounded-xl' />
          ))}
        </div>
        <Skeleton className='h-64 rounded-xl' />
      </div>
    ),
  }
);

export default function AdminReportPage() {
  const [filters, setFilters] = useState<AdminReportFilterState>({
    facultyId: null,
    period: '6m',
  });

  const { data: facultiesData, isLoading: facultiesLoading } = useAdminFaculties();
  const { data, isLoading, error, refetch, isFetching } = useAdminAnalytics({
    facultyId: filters.facultyId,
    period: filters.period,
  });

  return (
    <PageContainer fill>
      <div className='flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto p-3 md:p-4'>
        <PosPageHeader
          title='Platform analytics'
          onRefresh={() => void refetch()}
          refreshing={isFetching}
          showFullscreen={false}
        />
        <AdminReportsDashboard
          data={data}
          isLoading={isLoading && !data}
          isRefreshing={isFetching && !!data}
          error={error?.message}
          filters={filters}
          onFiltersChange={setFilters}
          faculties={facultiesData?.results ?? []}
          facultiesLoading={facultiesLoading}
          onRefresh={() => void refetch()}
        />
      </div>
    </PageContainer>
  );
}
